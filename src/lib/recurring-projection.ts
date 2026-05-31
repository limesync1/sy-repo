// Projektion af gentagende ruter i kalenderen.
// Vi bruger aftaler (`agreements`) som sandhed: hver aftale har et `interval`,
// en `start_date` (eller næste planlagte besøgs-dato) og evt. en `preferred_route_id`.
// Virtuelle ruter er read-only — de bliver til rigtige route_stops når
// DB-jobbet `auto_recur_due_orders` materialiserer dem, eller når en bruger
// dropper en aftale ind på en rute.
import {
  addDays, addWeeks, addMonths, addYears,
  format, parseISO, isBefore, differenceInCalendarDays,
} from "date-fns";
import { intervalToDays as intervalToDaysCentral, intervalToCadence, type IntervalUnit } from "@/lib/interval";

/**
 * Tynd indpakning omkring den centrale interval-lib — bevares som eksport
 * for bagudkompatibilitet (tests + ældre kode bruger denne path).
 */
export const intervalToDays = (interval: string | null | undefined): number | null =>
  intervalToDaysCentral(interval);

export type ProjectedRoute = {
  id: string;            // stable virtual id: `virtual:<routeId>:<date>`
  baseRouteId: string;
  date: string;          // yyyy-MM-dd
  /** De konkrete aftale-/abonnementskilder der falder på denne dato. */
  sourceKeys: string[];
};

/**
 * Override-række pr. forekomst af en gentagende aftale. Bruges til at flytte,
 * aflyse eller på anden vis ændre en enkelt forekomst uden at røre serien.
 */
export type AgreementOccurrenceOverride = {
  agreement_id: string;
  original_date: string;   // yyyy-MM-dd — den dato i serien der overskrives
  new_date?: string | null;
  status: "modified" | "cancelled" | "rescheduled";
};

/**
 * Pause-periode pr. aftale. Forekomster der falder mellem `start_date` og
 * `end_date` (inklusiv begge ender) projiceres ikke. Bruges fx når en kunde
 * holder ferie eller midlertidigt pauserer en abonnementsaftale.
 */
export type AgreementPauseRange = {
  agreement_id: string;
  start_date: string; // yyyy-MM-dd
  end_date: string;   // yyyy-MM-dd (inkl.)
};

export type RouteOccurrenceExceptionLike = {
  base_route_id: string;
  occurrence_date: string;
  replacement_route_id?: string | null;
  exception_type?: string | null;
  shifted_to_date?: string | null;
};

export const recurringSourceKeysForStop = (stop: any): string[] => {
  const occurrence = stop?.agreement_occurrences || stop?.agreement_occurrence || null;
  return [
    stop?.agreement_id ? `agr:${stop.agreement_id}` : null,
    occurrence?.agreement_id ? `agr:${occurrence.agreement_id}` : null,
    stop?.subscription_id ? `sub:${stop.subscription_id}` : null,
    stop?.order_id ? `order:${stop.order_id}` : null,
    occurrence?.legacy_order_id ? `order:${occurrence.legacy_order_id}` : null,
  ].filter(Boolean) as string[];
};

export const projectedStopMatchesSources = (stop: any, sourceKeys: string[] | undefined): boolean => {
  if (!sourceKeys || sourceKeys.length === 0) return true;
  const active = new Set(sourceKeys);
  return recurringSourceKeysForStop(stop).some((key) => active.has(key));
};

/**
 * Oversætter route-occurrence-exceptions til to rene datastrukturer, som
 * projektionen kan bruge uden UI-logik:
 *  - `suppressedProjectionKeys`: forekomster der helt skal skjules
 *  - `shiftsByOriginal`: forekomster der skal flyttes til en anden dato
 *
 * Vigtigt: `shifted` må IKKE undertrykkes før projektionen er bygget, ellers
 * findes original-forekomsten aldrig og kan derfor ikke flyttes til måldatoen.
 */
export const resolveProjectionExceptions = (
  exceptions: RouteOccurrenceExceptionLike[],
  realRouteIds: Set<string>,
) => {
  const suppressedProjectionKeys = new Set<string>();
  const shiftsByOriginal = new Map<string, string>();
  const movedReplacementRouteIds = new Set<string>();

  for (const ex of exceptions) {
    const baseId = String(ex.base_route_id || "");
    const date = String(ex.occurrence_date || "").slice(0, 10);
    const type = (ex.exception_type as string | null) ?? "moved";
    if (!baseId || !date) continue;

    if (type === "skipped") {
      suppressedProjectionKeys.add(`${baseId}|${date}`);
      continue;
    }

    if (type === "shifted") {
      const toDate = ex.shifted_to_date ? String(ex.shifted_to_date).slice(0, 10) : null;
      if (toDate) shiftsByOriginal.set(`${baseId}|${date}`, toDate);
      continue;
    }

    const replId = ex.replacement_route_id ? String(ex.replacement_route_id) : null;
    if (!replId || replId === baseId) continue;
    suppressedProjectionKeys.add(`${baseId}|${date}`);
    movedReplacementRouteIds.add(replId);
  }

  return { suppressedProjectionKeys, shiftsByOriginal, movedReplacementRouteIds };
};

/**
 * Udvider projektions-vinduet når en flyttet forekomst lander inde i den
 * synlige periode, men originaldatoen ligger udenfor.
 *
 * Eksempel: en ugentlig forekomst d. 22. juni flyttes til d. 17. juni.
 * Hvis brugeren kigger på uge 25 (16.-22. juni) virker det fint, men hvis de
 * kun kigger på dagene op til d. 17. juni skal vi stadig projicere d. 22. juni
 * i baggrunden, ellers findes der ingen original at flytte ind i viewet.
 */
export const expandProjectionWindowForShiftedOccurrences = (
  visibleStart: string,
  visibleEnd: string,
  exceptions: RouteOccurrenceExceptionLike[],
) => {
  let rangeStart = String(visibleStart).slice(0, 10);
  let rangeEnd = String(visibleEnd).slice(0, 10);

  for (const ex of exceptions) {
    const type = (ex.exception_type as string | null) ?? "moved";
    if (type !== "shifted") continue;

    const occurrenceDate = String(ex.occurrence_date || "").slice(0, 10);
    const shiftedToDate = String(ex.shifted_to_date || "").slice(0, 10);
    if (!occurrenceDate || !shiftedToDate) continue;

    if (shiftedToDate < rangeStart || shiftedToDate > rangeEnd) continue;
    if (occurrenceDate < rangeStart) rangeStart = occurrenceDate;
    if (occurrenceDate > rangeEnd) rangeEnd = occurrenceDate;
  }

  return { rangeStart, rangeEnd };
};

/**
 * Flytter projicerede forekomster til deres exception-måldatoer efter den
 * almindelige projektion er bygget.
 */
export const applyProjectedOccurrenceShifts = (
  projections: ProjectedRoute[],
  shiftsByOriginal: Map<string, string>,
  occupiedRouteDates: Set<string>,
): ProjectedRoute[] => {
  const byKey = new Map<string, ProjectedRoute>();

  for (const projection of projections) {
    const shiftTarget = shiftsByOriginal.get(`${projection.baseRouteId}|${projection.date}`);
    if (shiftTarget && occupiedRouteDates.has(`${projection.baseRouteId}|${shiftTarget}`)) {
      continue;
    }

    const nextDate = shiftTarget ?? projection.date;
    const key = `${projection.baseRouteId}|${nextDate}`;
    const nextProjection = shiftTarget
      ? { ...projection, date: nextDate, id: `virtual:${projection.baseRouteId}:${nextDate}` }
      : projection;

    const existing = byKey.get(key);
    if (existing) {
      const sourceKeys = Array.from(new Set([...existing.sourceKeys, ...nextProjection.sourceKeys]));
      byKey.set(key, { ...existing, sourceKeys, id: `virtual:${existing.baseRouteId}:${nextDate}` });
      continue;
    }

    byKey.set(key, nextProjection);
  }

  return Array.from(byKey.values());
};

/**
 * Filtrerer en liste af stops så vi kun beholder dem der tilhører den
 * konkrete dag — vurderet ud fra deres linkede `agreement_occurrence`'s
 * `occurrence_date`.
 *
 * Regler:
 *  - Stops UDEN nogen `agreement_occurrence(s).occurrence_date` slipper
 *    altid igennem (one-off ordrer, legacy-data, ad-hoc tilføjelser).
 *  - Stops MED en occurrence der peger på en anden dato end `dayDate`
 *    skjules — de er "fremmede" forekomster der ved en fejl ligger på
 *    den forkerte rute (typisk pga. legacy-materialisering).
 *
 * Bruges både i medarbejder-app (`useMyDayStops`, `useMyRouteData`) for
 * at sikre at medarbejderen kun ser de aftaler der reelt skal udføres
 * netop den dag — uanset hvilke historiske rækker der måtte ligge på
 * basisruten.
 */
export const filterStopsByOccurrenceDate = <T extends Record<string, any>>(
  stops: T[],
  dayDate: string,
): T[] => {
  if (!stops || stops.length === 0) return stops ?? [];
  const target = String(dayDate).slice(0, 10);
  return stops.filter((s) => {
    const occ = s?.agreement_occurrence || s?.agreement_occurrences || null;
    const occDate = occ?.occurrence_date as string | undefined;
    if (!occDate) return true;
    return String(occDate).slice(0, 10) === target;
  });
};

type RecurringSource = {
  id: string;
  interval: string;
  /** Brugerdefineret antal dage mellem forekomster — bruges når interval === "custom". */
  interval_days?: number | null;
  /** First date of the series (yyyy-MM-dd or ISO timestamp). */
  seed_date: string | null;
  /** Stabil kalender-anker-dato, typisk basisrutens route_date. Tillader projektion både før og efter ankeret. */
  anchor_date?: string | null;
  preferred_route_id: string | null;
  /** Match-nøgler til stops: fx `agr:<id>`, `sub:<id>`, `order:<id>`. */
  sourceKeys?: string[];
  /** Aftalens id (når kilden er en aftale). Bruges til at slå overrides op. */
  agreement_id?: string | null;
};

export const expandRecurringRoutes = (params: {
  sources: RecurringSource[];
  rangeStart: string;
  rangeEnd: string;
  /** @deprecated Ikke længere brugt — projektionen er uendelig og styres kun af rangeEnd. */
  horizonDays?: number;
  /** Sæt af `${routeId}|${yyyy-MM-dd}` der allerede har en rigtig rute — disse springes over. */
  realRouteDates: Set<string>;
  /** Per-forekomst overrides — aflyser/flytter enkelte forekomster uden at røre serien. */
  overrides?: AgreementOccurrenceOverride[];
  /** Pause-perioder pr. aftale — forekomster der falder i et pause-vindue projiceres ikke. */
  pauses?: AgreementPauseRange[];
  /** Datoer (yyyy-MM-dd) hvor INGEN gentagende aftaler projiceres (helligdage/lukkedage). */
  holidayDates?: Iterable<string>;
  /** Callback når en kilde IKKE kan projiceres — bruges til UI-advarsler så fejl ikke bare "forsvinder". */
  onUnprojectable?: (source: RecurringSource, reason: "missing_route" | "missing_seed" | "invalid_interval") => void;
}): ProjectedRoute[] => {
  // Index overrides pr. aftale så lookup pr. dato er O(1).
  const overridesByAgreement = new Map<string, Map<string, AgreementOccurrenceOverride>>();
  for (const o of params.overrides || []) {
    const inner = overridesByAgreement.get(o.agreement_id) || new Map();
    inner.set(String(o.original_date).slice(0, 10), o);
    overridesByAgreement.set(o.agreement_id, inner);
  }

  // Index pauser pr. aftale — vi gemmer som array af [start, end] strings og
  // bruger string-sammenligning (yyyy-MM-dd er leksikografisk dato-sikker).
  const pausesByAgreement = new Map<string, Array<[string, string]>>();
  for (const p of params.pauses || []) {
    if (!p.agreement_id || !p.start_date || !p.end_date) continue;
    const arr = pausesByAgreement.get(p.agreement_id) || [];
    arr.push([String(p.start_date).slice(0, 10), String(p.end_date).slice(0, 10)]);
    pausesByAgreement.set(p.agreement_id, arr);
  }
  const holidaySet = new Set<string>();
  if (params.holidayDates) {
    for (const d of params.holidayDates) holidaySet.add(String(d).slice(0, 10));
  }
  const isPausedForAgreement = (agreementId: string | null | undefined, ds: string): boolean => {
    if (!agreementId) return false;
    const ranges = pausesByAgreement.get(agreementId);
    if (!ranges) return false;
    return ranges.some(([s, e]) => ds >= s && ds <= e);
  };

  // Projicerer pr. kilde (aftale) og samler datoer pr. rute, så samme dato
  // ikke duplikeres når flere aftaler falder sammen på samme rute/dag.
  const byRouteDate = new Map<string, ProjectedRoute>(); // `${routeId}|${date}`
  const out: ProjectedRoute[] = [];
  const start = parseISO(params.rangeStart);
  // Projicér så langt frem brugeren kigger — ingen kunstig horisont, så
  // gentagende ruter altid vises uanset hvilken måned/år kalenderen står på.
  const limit = parseISO(params.rangeEnd);

  for (const s of params.sources) {
    if (!s.preferred_route_id) { params.onUnprojectable?.(s, "missing_route"); continue; }
    if (!s.seed_date && !s.anchor_date) { params.onUnprojectable?.(s, "missing_seed"); continue; }
    // Parse intervallet til (n, unit) så vi bruger ægte kalender-aritmetik for
    // ALLE understøttede intervaller. Custom dagstal løftes til uge/måned/år
    // når de repræsenterer en klassisk cadence (fx 14 dage → 2 uger,
    // 30 dage → 1 måned), så projektioner ikke ender som "hver 31. dag".
    const cadence = intervalToCadence(s.interval, s.interval_days);
    if (!cadence) { params.onUnprojectable?.(s, "invalid_interval"); continue; }
    const { n } = cadence;
    const unit: IntervalUnit = cadence.unit;
    const advance = (d: Date, steps: number): Date => {
      switch (unit) {
        case "day":   return addDays(d, steps * n);
        case "week":  return addWeeks(d, steps * n);
        case "month": return addMonths(d, steps * n);
        case "year":  return addYears(d, steps * n);
      }
    };
    // Ved sammenligning/fast-forward er det fint at bruge en grov "dage pr. step"-tilnærmelse,
    // fordi vi efterfølgende stepper med præcise kalender-enheder via `advance`.
    let stepDays = 0;
    switch (unit) {
      case "day":   stepDays = n; break;
      case "week":  stepDays = n * 7; break;
      case "month": stepDays = n * 30; break;
      case "year":  stepDays = n * 365; break;
    }
    const routeId = s.preferred_route_id;
    let seed: Date;
    const rawSeed = String((s.anchor_date || s.seed_date) ?? "").slice(0, 10);
    try {
      seed = parseISO(rawSeed);
      if (Number.isNaN(seed.getTime())) continue;
    } catch {
      continue;
    }
    // Hård nedre grænse for projektionen: vi viser aldrig forekomster før
    // hverken aftalens start eller basisrutens første dato. Det undgår at
    // en 27. maj-rute projiceres tilbage til 6. maj for en 3-ugers aftale
    // — den rute er aldrig blevet kørt, så historiske "kunne være kørt"
    // datoer giver ingen mening.
    const earliestCandidates = [s.seed_date, s.anchor_date]
      .filter((d): d is string => !!d)
      .map((d) => parseISO(String(d).slice(0, 10)))
      .filter((d) => !Number.isNaN(d.getTime()));
    const earliest = earliestCandidates.length > 0
      ? earliestCandidates.reduce((a, b) => (isBefore(a, b) ? b : a))
      : seed;
    // Spol cursor til første forekomst inden for det synlige interval.
    // Uden anchor_date bevarer vi gammel semantik: seed_date er første mulige
    // forekomst. Med anchor_date (basisrutens dato) behandler vi derimod ruten
    // som et stabilt punkt i en uendelig kalender-serie, så fx en 14-dages
    // aftale på en basisrute d. 28 også giver en forekomst d. 14.
    let stepIndex = s.anchor_date ? Math.floor(differenceInCalendarDays(start, seed) / Math.max(1, stepDays)) - 1 : 0;
    if (isBefore(seed, start)) {
      const diff = differenceInCalendarDays(start, seed);
      stepIndex = Math.max(stepIndex, Math.floor(diff / Math.max(1, stepDays)) - 1);
    }
    let cursor = advance(seed, stepIndex);
    while (isBefore(cursor, start)) {
      stepIndex += 1;
      cursor = advance(seed, stepIndex);
    }
    // Safety-loft højt nok til daglige aftaler i flere års sigte uden at
    // risikere uendelig løkke ved misformede data.
    let safety = 0;
    while (!isBefore(limit, cursor) && safety++ < 4000) {
      const rawDs = format(cursor, "yyyy-MM-dd");
      // Anvend evt. override på denne forekomst — aflyste hoppes over,
      // flyttede projiceres på den nye dato i stedet.
      const ovr = s.agreement_id ? overridesByAgreement.get(s.agreement_id)?.get(rawDs) : undefined;
      if (ovr?.status === "cancelled") {
        stepIndex += 1;
        cursor = advance(seed, stepIndex);
        continue;
      }
      const ds = (ovr?.new_date && (ovr.status === "rescheduled" || ovr.status === "modified"))
        ? String(ovr.new_date).slice(0, 10)
        : rawDs;
      // Spring helligdage og pause-perioder over — forekomster på disse dage
      // skal hverken vises i kalenderen eller materialiseres.
      if (holidaySet.has(ds) || isPausedForAgreement(s.agreement_id, ds)) {
        stepIndex += 1;
        cursor = advance(seed, stepIndex);
        continue;
      }
      const key = `${routeId}|${ds}`;
      const cursorForBounds = ds === rawDs ? cursor : parseISO(ds);
      if (!isBefore(cursorForBounds, start) && !isBefore(cursorForBounds, earliest) && !params.realRouteDates.has(key)) {
        const sourceKeys = (s.sourceKeys && s.sourceKeys.length > 0) ? s.sourceKeys : [s.id];
        const existing = byRouteDate.get(key);
        if (existing) {
          const merged = new Set(existing.sourceKeys);
          sourceKeys.forEach((sourceKey) => merged.add(sourceKey));
          existing.sourceKeys = Array.from(merged);
        } else {
          const projected = { id: `virtual:${routeId}:${ds}`, baseRouteId: routeId, date: ds, sourceKeys: Array.from(new Set(sourceKeys)) };
          byRouteDate.set(key, projected);
          out.push(projected);
        }
      }
      stepIndex += 1;
      cursor = advance(seed, stepIndex);
    }
  }
  return out;
};
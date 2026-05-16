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
};

export const expandRecurringRoutes = (params: {
  sources: RecurringSource[];
  rangeStart: string;
  rangeEnd: string;
  /** @deprecated Ikke længere brugt — projektionen er uendelig og styres kun af rangeEnd. */
  horizonDays?: number;
  /** Sæt af `${routeId}|${yyyy-MM-dd}` der allerede har en rigtig rute — disse springes over. */
  realRouteDates: Set<string>;
}): ProjectedRoute[] => {
  // Projicerer pr. kilde (aftale) og samler datoer pr. rute, så samme dato
  // ikke duplikeres når flere aftaler falder sammen på samme rute/dag.
  const byRouteDate = new Map<string, ProjectedRoute>(); // `${routeId}|${date}`
  const out: ProjectedRoute[] = [];
  const start = parseISO(params.rangeStart);
  // Projicér så langt frem brugeren kigger — ingen kunstig horisont, så
  // gentagende ruter altid vises uanset hvilken måned/år kalenderen står på.
  const limit = parseISO(params.rangeEnd);

  for (const s of params.sources) {
    if (!s.preferred_route_id || (!s.seed_date && !s.anchor_date)) continue;
    // Parse intervallet til (n, unit) så vi bruger ægte kalender-aritmetik for
    // ALLE understøttede intervaller. Custom dagstal løftes til uge/måned/år
    // når de repræsenterer en klassisk cadence (fx 14 dage → 2 uger,
    // 30 dage → 1 måned), så projektioner ikke ender som "hver 31. dag".
    const cadence = intervalToCadence(s.interval, s.interval_days);
    if (!cadence) continue;
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
      const ds = format(cursor, "yyyy-MM-dd");
      const key = `${routeId}|${ds}`;
      if (!isBefore(cursor, start) && !params.realRouteDates.has(key)) {
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
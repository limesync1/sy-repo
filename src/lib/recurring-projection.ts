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
import { intervalToDays as intervalToDaysCentral, parseInterval } from "@/lib/interval";

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
  // Hård sikring: projicér ALDRIG i fortiden, uanset hvilken rangeStart
  // kalderen sender ind. Bruges som defense-in-depth oven på UI-clamp.
  const today = parseISO(format(new Date(), "yyyy-MM-dd"));
  const requestedStart = parseISO(params.rangeStart);
  const start = isBefore(requestedStart, today) ? today : requestedStart;
  // Projicér så langt frem brugeren kigger — ingen kunstig horisont, så
  // gentagende ruter altid vises uanset hvilken måned/år kalenderen står på.
  const limit = parseISO(params.rangeEnd);

  for (const s of params.sources) {
    if (!s.preferred_route_id || !s.seed_date) continue;
    // Parse intervallet til (n, unit) så vi kan bruge ægte kalender-aritmetik
    // for måneder/år — ellers driver projektionen (30/365 dages tilnærmelse
    // tager fx en månedlig 1. → 1. → 31. → 30. ... over et år).
    let n = 0;
    let unit: "day" | "week" | "month" | "year" = "day";
    const parsed = parseInterval(s.interval);
    if (parsed && !parsed.once) {
      n = parsed.n;
      unit = parsed.unit;
    } else if (s.interval === "custom" && s.interval_days && s.interval_days > 0) {
      n = s.interval_days;
      unit = "day";
    }
    if (!n) continue;
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
    try {
      seed = parseISO(String(s.seed_date).slice(0, 10));
      if (Number.isNaN(seed.getTime())) continue;
    } catch {
      continue;
    }
    // Spol cursor frem til første forekomst inden for det synlige interval.
    // Sparer iterationer når seed ligger langt tilbage i tiden. Vi bruger
    // dages-tilnærmelse til at *gætte* hvor mange steps der skal springes,
    // og finder så den præcise position med kalender-aritmetik bagefter.
    let stepIndex = 0;
    if (isBefore(seed, start)) {
      const diff = differenceInCalendarDays(start, seed);
      stepIndex = Math.max(0, Math.floor(diff / Math.max(1, stepDays)) - 1);
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
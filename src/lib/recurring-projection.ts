// Projektion af gentagende ruter i kalenderen.
// Vi bruger aftaler (`agreements`) som sandhed: hver aftale har et `interval`,
// en `start_date` (eller næste planlagte besøgs-dato) og evt. en `preferred_route_id`.
// Virtuelle ruter er read-only — de bliver til rigtige route_stops når
// DB-jobbet `auto_recur_due_orders` materialiserer dem, eller når en bruger
// dropper en aftale ind på en rute.
import { addDays, format, parseISO, isBefore, differenceInCalendarDays } from "date-fns";
import { intervalToDays as intervalToDaysCentral } from "@/lib/interval";

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
};

type RecurringSource = {
  id: string;
  interval: string;
  /** Brugerdefineret antal dage mellem forekomster — bruges når interval === "custom". */
  interval_days?: number | null;
  /** First date of the series (yyyy-MM-dd or ISO timestamp). */
  seed_date: string | null;
  preferred_route_id: string | null;
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
  const seen = new Set<string>(); // `${routeId}|${date}`
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
    let days = intervalToDays(s.interval);
    if (!days && s.interval === "custom" && s.interval_days && s.interval_days > 0) {
      days = s.interval_days;
    }
    if (!days) continue;
    const routeId = s.preferred_route_id;
    let cursor: Date;
    try {
      cursor = parseISO(String(s.seed_date).slice(0, 10));
      if (Number.isNaN(cursor.getTime())) continue;
    } catch {
      continue;
    }
    // Spol cursor frem til første forekomst inden for det synlige interval.
    // Sparer iterationer når seed ligger langt tilbage i tiden (fx ugentlig
    // aftale fra 2024 og vi viser maj 2026).
    if (isBefore(cursor, start)) {
      const diff = differenceInCalendarDays(start, cursor);
      const stepsAhead = Math.floor(diff / days);
      if (stepsAhead > 0) cursor = addDays(cursor, stepsAhead * days);
    }
    // Safety-loft højt nok til daglige aftaler i flere års sigte uden at risikere
    // uendelig løkke ved misformede data (fx negative interval_days).
    let safety = 0;
    while (!isBefore(limit, cursor) && safety++ < 4000) {
      const ds = format(cursor, "yyyy-MM-dd");
      const key = `${routeId}|${ds}`;
      if (
        !isBefore(cursor, start) &&
        !params.realRouteDates.has(key) &&
        !seen.has(key)
      ) {
        seen.add(key);
        out.push({ id: `virtual:${routeId}:${ds}`, baseRouteId: routeId, date: ds });
      }
      cursor = addDays(cursor, days);
    }
  }
  return out;
};
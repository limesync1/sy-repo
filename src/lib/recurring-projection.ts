// Projektion af gentagende ruter i kalenderen.
// Subscriptions har en `interval` + `next_service_date` + `preferred_route_id`.
// Vi bruger den til at "tegne" virtuelle forekomster af eksisterende ruter på
// fremtidige datoer indtil en horisont (default 180 dage). Virtuelle ruter er
// read-only — de bliver til rigtige route_stops når DB-jobbet `auto_recur_due_orders`
// kører efter `next_service_date` er passeret.
import { addDays, format, parseISO, isBefore } from "date-fns";

export const intervalToDays = (interval: string | null | undefined): number | null => {
  if (!interval) return null;
  switch (interval) {
    case "ugentlig": return 7;
    case "hver_14_dag": return 14;
    case "hver_4_uge": return 28;
    case "månedlig": return 30;
    case "kvartalsvis": return 91;
    case "halvårlig": return 182;
    case "årlig": return 365;
    default: return null;
  }
};

export type ProjectedRoute = {
  id: string;            // stable virtual id: `virtual:<routeId>:<date>`
  baseRouteId: string;
  date: string;          // yyyy-MM-dd
};

type Sub = {
  id: string;
  interval: string;
  status: string;
  next_service_date: string | null;
  preferred_route_id: string | null;
};

export const expandRecurringRoutes = (params: {
  subscriptions: Sub[];
  rangeStart: string;
  rangeEnd: string;
  horizonDays?: number;
  /** Sæt af `${routeId}|${yyyy-MM-dd}` der allerede har en rigtig rute — disse springes over. */
  realRouteDates: Set<string>;
}): ProjectedRoute[] => {
  const out: ProjectedRoute[] = [];
  const start = parseISO(params.rangeStart);
  const end = parseISO(params.rangeEnd);
  const horizonEnd = addDays(new Date(), params.horizonDays ?? 180);
  const limit = isBefore(end, horizonEnd) ? end : horizonEnd;

  // Vi grupperer pr. rute — den tidligste next_service_date på ruten styrer kadencen.
  const byRoute = new Map<string, { interval: string; next: string }>();
  for (const s of params.subscriptions) {
    if (s.status !== "active") continue;
    if (!s.preferred_route_id || !s.next_service_date) continue;
    const days = intervalToDays(s.interval);
    if (!days) continue;
    const next = String(s.next_service_date).slice(0, 10);
    const ex = byRoute.get(s.preferred_route_id);
    if (!ex || next < ex.next) byRoute.set(s.preferred_route_id, { interval: s.interval, next });
  }

  for (const [routeId, { interval, next }] of byRoute) {
    const days = intervalToDays(interval)!;
    let cursor = parseISO(next);
    let safety = 0;
    while (!isBefore(limit, cursor) && safety++ < 400) {
      const ds = format(cursor, "yyyy-MM-dd");
      if (!isBefore(cursor, start) && !params.realRouteDates.has(`${routeId}|${ds}`)) {
        out.push({ id: `virtual:${routeId}:${ds}`, baseRouteId: routeId, date: ds });
      }
      cursor = addDays(cursor, days);
    }
  }
  return out;
};
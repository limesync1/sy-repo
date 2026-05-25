/**
 * Forslagsmotor for rutekalenderen (L3).
 *
 * Rene funktioner — ingen netværkskald. Modtager allerede-hentede ruter,
 * stops og medarbejdere og udregner forslag som UI kan vise i fejl-/
 * advarselsdialoger og diagnostik-paneler.
 */

import { addDays, parseISO, format } from "date-fns";
import { distanceKm, type Suggestion } from "./route-validation";

export type RouteLite = {
  id: string;
  route_date: string; // YYYY-MM-DD
  employee_id?: string | null;
  stops?: Array<{ latitude?: number | null; longitude?: number | null }>;
  isVirtual?: boolean;
};

/* ─────────────────────────────────────────
   1) Foreslå nærmeste tomme dag samme uge
   ───────────────────────────────────────── */

export function suggestNearestEmptyDay(
  fromDate: string,
  routes: RouteLite[],
  opts: { capacityPerDay?: number; searchDays?: number } = {},
): Suggestion | null {
  const cap = opts.capacityPerDay ?? 12;
  const span = opts.searchDays ?? 7;
  const countByDate = new Map<string, number>();
  for (const r of routes) {
    countByDate.set(r.route_date, (countByDate.get(r.route_date) ?? 0) + (r.stops?.length ?? 0));
  }
  const base = parseISO(fromDate);
  const today = new Date().toISOString().slice(0, 10);
  for (let offset = 1; offset <= span; offset++) {
    for (const sign of [1, -1]) {
      const d = format(addDays(base, sign * offset), "yyyy-MM-dd");
      if (d < today) continue;
      if ((countByDate.get(d) ?? 0) < cap) {
        return {
          label: `Flyt til ${d}`,
          description: "Nærmeste dag med ledig kapacitet",
          action: "move-to-date",
          payload: { date: d },
        };
      }
    }
  }
  return null;
}

/* ─────────────────────────────────────────
   2) Foreslå nærmere rute samme dag
   ───────────────────────────────────────── */

export function suggestNearestRoute(
  stop: { latitude?: number | null; longitude?: number | null },
  date: string,
  routes: RouteLite[],
  excludeRouteId?: string,
): Suggestion | null {
  if (!stop.latitude || !stop.longitude) return null;
  let best: { id: string; km: number } | null = null;
  for (const r of routes) {
    if (r.route_date !== date) continue;
    if (r.id === excludeRouteId) continue;
    if (r.isVirtual) continue;
    for (const s of r.stops ?? []) {
      const d = distanceKm({ lat: stop.latitude, lng: stop.longitude }, { lat: s.latitude, lng: s.longitude });
      if (d === null) continue;
      if (!best || d < best.km) best = { id: r.id, km: d };
    }
  }
  if (!best || best.km > 40) return null;
  return {
    label: `Tildel nærmere rute (${best.km} km)`,
    description: "Anden rute samme dag ligger tættere på",
    action: "assign-to-route",
    payload: { routeId: best.id },
  };
}

/* ─────────────────────────────────────────
   3) Foreslå anden ledig medarbejder
   ───────────────────────────────────────── */

export function suggestAlternativeEmployee(
  date: string,
  bookedEmployeeIds: string[],
  allEmployees: Array<{ id: string; name?: string | null; active?: boolean | null }>,
  routesOnDate: RouteLite[],
): Suggestion | null {
  const booked = new Set(bookedEmployeeIds);
  const busyOnDate = new Set(routesOnDate.filter((r) => r.route_date === date).map((r) => r.employee_id).filter(Boolean) as string[]);
  const free = allEmployees.find((e) => (e.active !== false) && !booked.has(e.id) && !busyOnDate.has(e.id));
  if (!free) return null;
  return {
    label: `Tildel ${free.name ?? "ledig medarbejder"}`,
    description: "Første ledige medarbejder på dagen",
    action: "assign-employee",
    payload: { employeeId: free.id, date },
  };
}

/* ─────────────────────────────────────────
   4) Preview af de næste N datoer for et interval
   ───────────────────────────────────────── */

export type IntervalPreview = {
  date: string;
  conflict: boolean;
  reason?: string;
};

export function previewIntervalDates(
  anchor: string,
  intervalDays: number,
  count: number,
  existingRoutesByDate: Set<string>,
): IntervalPreview[] {
  if (!intervalDays || intervalDays <= 0) return [];
  const base = parseISO(anchor);
  const out: IntervalPreview[] = [];
  for (let i = 1; i <= count; i++) {
    const d = format(addDays(base, i * intervalDays), "yyyy-MM-dd");
    const conflict = existingRoutesByDate.has(d);
    out.push({ date: d, conflict, reason: conflict ? "Findes allerede en rute på datoen" : undefined });
  }
  return out;
}

/* ─────────────────────────────────────────
   5) Diagnostik for ikke-projicérbare aftaler
   ───────────────────────────────────────── */

export type UnprojectableReason = "missing_route" | "missing_seed" | "invalid_interval";

export function describeUnprojectable(reason: UnprojectableReason): { title: string; hint: string; fixLabel: string; fixAction: string } {
  switch (reason) {
    case "missing_route":
      return {
        title: "Aftalen har ingen foretrukken rute",
        hint: "Tildel en foretrukken rute for at projicere kommende forekomster i kalenderen.",
        fixLabel: "Tildel rute",
        fixAction: "set-preferred-route",
      };
    case "missing_seed":
      return {
        title: "Aftalen mangler startdato",
        hint: "Aftalen har hverken seed_date eller anchor_date — uden en startdato kan vi ikke beregne kommende datoer.",
        fixLabel: "Åbn aftale",
        fixAction: "open-agreement",
      };
    case "invalid_interval":
      return {
        title: "Ugyldigt interval",
        hint: "Aftalens interval kan ikke oversættes til et gentagelses-mønster. Vælg et standard-interval (uge, hver 14. dag, måned …).",
        fixLabel: "Ret interval",
        fixAction: "open-agreement",
      };
  }
}
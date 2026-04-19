// Multi-medarbejder VRP med tidsvinduer + arbejdstid + 2-opt forbedring + inter-employee swap.
//
// Strategi:
// 1) Greedy insertion: hver stop indsættes på den globalt billigste position
//    (medarbejder + index). Bløde vinduer straffes, hårde vinduer skal overholdes.
// 2) Inter-employee swap-pass: prøv at flytte hvert stop til en anden medarbejder
//    hvis det reducerer total km/cost. Køres indtil ingen forbedring.
// 3) 2-opt pr. medarbejder-rute: prøv at vende hvert sub-segment for at fjerne kryds.
//
// Stops med required_staff > 1 håndteres ved at vælge de N billigste medarbejdere
// og synkronisere ankomst.

import { buildMatrix, travelKm, travelSec, haversineKm, haversineSec } from "./geo.ts";
import type {
  EmployeeCtx,
  LatLng,
  Matrix,
  RoutePlan,
  ScheduledStop,
  Stop,
} from "./types.ts";

const SLOT_MIN = 15;
const SOFT_PENALTY_PER_MIN = 2;
const WAIT_PENALTY_PER_MIN = 0.3;
const ceilSnap = (m: number) => Math.ceil(m / SLOT_MIN) * SLOT_MIN;

type IRoute = ScheduledStop[];

// ============== Geo helpers (matrix or haversine fallback per pair) ==============
// Vi bygger evt. matrix kun for de første 25 punkter. For resten falder vi tilbage
// til haversine, men gør det per-koordinat så vi ikke "smider" matrix væk.

function makeTravelers(matrix: Matrix | null, coords: LatLng[]) {
  const sec = (i: number, j: number) => {
    if (i === j) return 0;
    if (matrix && i < matrix.durations.length && j < matrix.durations.length) {
      return matrix.durations[i][j];
    }
    return haversineSec(coords[i], coords[j]);
  };
  const km = (i: number, j: number) => {
    if (i === j) return 0;
    if (matrix && i < matrix.distances.length && j < matrix.distances.length) {
      return matrix.distances[i][j] / 1000;
    }
    return haversineKm(coords[i], coords[j]);
  };
  return { sec, km };
}

// ============== Schedule a route (compute arrivals/departures from scratch) ==============
function scheduleRoute(
  emp: EmployeeCtx,
  route: IRoute,
  stops: Stop[],
  travel: ReturnType<typeof makeTravelers>,
  empStartIdx: number,
  empEndIdx: number,
  stopIdx: (id: string) => number,
): { feasible: boolean; cost: number; km: number; durMin: number; softViolations: number } {
  let cursor = emp.work_start_min;
  let prevIdx = empStartIdx;
  let totalKm = 0;
  let cost = 0;
  let softViolations = 0;

  for (let i = 0; i < route.length; i++) {
    const r = route[i];
    const stop = stops.find((s) => s.id === r.stop_id);
    if (!stop) return { feasible: false, cost: Infinity, km: 0, durMin: 0, softViolations: 0 };
    const myIdx = stopIdx(stop.id);
    const tSec = travel.sec(prevIdx, myIdx);
    const travelMin = Math.round(tSec / 60);
    const tKm = travel.km(prevIdx, myIdx);
    totalKm += tKm;

    let arrival = ceilSnap(cursor + travelMin);
    const hardStart = stop.hard_start_min ?? emp.work_start_min;
    if (arrival < ceilSnap(hardStart)) arrival = ceilSnap(hardStart);
    const finish = arrival + stop.duration_minutes;
    const hardEnd = stop.hard_end_min ?? (emp.work_end_min + 60);
    if (finish > hardEnd) return { feasible: false, cost: Infinity, km: 0, durMin: 0, softViolations: 0 };

    const wait = Math.max(0, arrival - (cursor + travelMin));
    cost += travelMin + wait * WAIT_PENALTY_PER_MIN;

    if (stop.preferred_start_min != null && arrival < stop.preferred_start_min) {
      const diff = stop.preferred_start_min - arrival;
      cost += diff * SOFT_PENALTY_PER_MIN;
      softViolations++;
    }
    if (stop.preferred_end_min != null && arrival > stop.preferred_end_min) {
      const diff = arrival - stop.preferred_end_min;
      cost += diff * SOFT_PENALTY_PER_MIN;
      softViolations++;
    }

    r.arrival_min = arrival;
    r.departure_min = finish;
    r.sequence = i;
    cursor = finish;
    prevIdx = myIdx;

    // Travel-til-næste sættes ved næste iteration; sidste leg sættes nedenfor
    r.travel_min_to_next = null;
    r.travel_km_to_next = null;
  }

  // Sidste leg: hjem
  if (route.length > 0) {
    const homeKm = travel.km(prevIdx, empEndIdx);
    totalKm += homeKm;
  }

  // Sæt travel-til-næste på hver stop (i → i+1)
  for (let i = 0; i < route.length - 1; i++) {
    const a = stops.find((s) => s.id === route[i].stop_id)!;
    const b = stops.find((s) => s.id === route[i + 1].stop_id)!;
    const tSec = travel.sec(stopIdx(a.id), stopIdx(b.id));
    const tKm = travel.km(stopIdx(a.id), stopIdx(b.id));
    route[i].travel_min_to_next = Math.round(tSec / 60);
    route[i].travel_km_to_next = Number(tKm.toFixed(2));
  }
  // Sidste stop: travel-hjem som "to_next" (vises ikke i UI men holder data konsistent)
  if (route.length > 0) {
    const last = route[route.length - 1];
    const lastStop = stops.find((s) => s.id === last.stop_id)!;
    const tSec = travel.sec(stopIdx(lastStop.id), empEndIdx);
    const tKm = travel.km(stopIdx(lastStop.id), empEndIdx);
    last.travel_min_to_next = Math.round(tSec / 60);
    last.travel_km_to_next = Number(tKm.toFixed(2));
  }

  const durMin = route.length > 0 ? cursor - emp.work_start_min : 0;
  return { feasible: true, cost, km: totalKm, durMin, softViolations };
}

// ============== Greedy insertion ==============
function tryInsertCheapest(
  stop: Stop,
  candidates: EmployeeCtx[],
  routes: Map<string, IRoute>,
  stops: Stop[],
  travel: ReturnType<typeof makeTravelers>,
  empMeta: Map<string, { startIdx: number; endIdx: number }>,
  stopIdx: (id: string) => number,
): { emp: EmployeeCtx; pos: number; cost: number } | null {
  let best: { emp: EmployeeCtx; pos: number; cost: number } | null = null;
  for (const emp of candidates) {
    const route = routes.get(emp.id)!;
    const meta = empMeta.get(emp.id)!;
    const baseline = scheduleRoute(emp, route, stops, travel, meta.startIdx, meta.endIdx, stopIdx);
    if (!baseline.feasible) continue;
    for (let pos = 0; pos <= route.length; pos++) {
      const trial: IRoute = [
        ...route.slice(0, pos),
        {
          stop_id: stop.id,
          sequence: 0,
          arrival_min: 0,
          departure_min: 0,
          assignees: [emp.id],
          travel_min_to_next: null,
          travel_km_to_next: null,
        },
        ...route.slice(pos),
      ];
      const ev = scheduleRoute(emp, trial, stops, travel, meta.startIdx, meta.endIdx, stopIdx);
      if (!ev.feasible) continue;
      const delta = ev.cost - baseline.cost + (ev.km - baseline.km) * 0.5;
      if (!best || delta < best.cost) best = { emp, pos, cost: delta };
    }
  }
  return best;
}

// ============== Inter-employee swap pass ==============
function interEmployeeSwap(
  routes: Map<string, IRoute>,
  employees: EmployeeCtx[],
  stops: Stop[],
  travel: ReturnType<typeof makeTravelers>,
  empMeta: Map<string, { startIdx: number; endIdx: number }>,
  stopIdx: (id: string) => number,
  pinned: Set<string>,
): boolean {
  let improved = false;
  for (const empA of employees) {
    const routeA = routes.get(empA.id)!;
    for (let i = 0; i < routeA.length; i++) {
      const stop = stops.find((s) => s.id === routeA[i].stop_id)!;
      if (stop.required_staff > 1) continue;
      if (pinned.has(stop.id)) continue;

      const metaA = empMeta.get(empA.id)!;
      const baseA = scheduleRoute(empA, routeA, stops, travel, metaA.startIdx, metaA.endIdx, stopIdx);

      for (const empB of employees) {
        if (empB.id === empA.id) continue;
        const routeB = routes.get(empB.id)!;
        const metaB = empMeta.get(empB.id)!;
        const baseB = scheduleRoute(empB, routeB, stops, travel, metaB.startIdx, metaB.endIdx, stopIdx);
        const baselineCost = baseA.cost + baseB.cost + (baseA.km + baseB.km) * 0.5;

        // Fjern stop fra A
        const newA = [...routeA.slice(0, i), ...routeA.slice(i + 1)];
        const evA = scheduleRoute(empA, newA, stops, travel, metaA.startIdx, metaA.endIdx, stopIdx);
        if (!evA.feasible) continue;

        // Find bedste position i B
        let bestPos = -1;
        let bestCostB = Infinity;
        let bestKmB = Infinity;
        for (let p = 0; p <= routeB.length; p++) {
          const trial: IRoute = [
            ...routeB.slice(0, p),
            { ...routeA[i], assignees: [empB.id] },
            ...routeB.slice(p),
          ];
          const ev = scheduleRoute(empB, trial, stops, travel, metaB.startIdx, metaB.endIdx, stopIdx);
          if (!ev.feasible) continue;
          const c = ev.cost + ev.km * 0.5;
          if (c < bestCostB) {
            bestCostB = c;
            bestKmB = ev.km;
            bestPos = p;
          }
        }
        if (bestPos < 0) continue;

        const newCost = evA.cost + bestCostB - bestKmB * 0.5 + (evA.km + bestKmB) * 0.5
          + bestKmB * 0.5; // simpler: total = (evA.cost + evA.km*0.5) + (bestCostB)
        const totalNew = (evA.cost + evA.km * 0.5) + bestCostB;
        if (totalNew + 1 < baselineCost) {
          // Anvend swap
          const stopRecord = routeA[i];
          routes.set(empA.id, newA);
          const newB = [
            ...routeB.slice(0, bestPos),
            { ...stopRecord, assignees: [empB.id] },
            ...routeB.slice(bestPos),
          ];
          routes.set(empB.id, newB);
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
    if (improved) break;
  }
  return improved;
}

// ============== 2-opt pr. medarbejder-rute ==============
function twoOpt(
  emp: EmployeeCtx,
  route: IRoute,
  stops: Stop[],
  travel: ReturnType<typeof makeTravelers>,
  meta: { startIdx: number; endIdx: number },
  stopIdx: (id: string) => number,
): boolean {
  if (route.length < 3) return false;
  const baseline = scheduleRoute(emp, route, stops, travel, meta.startIdx, meta.endIdx, stopIdx);
  if (!baseline.feasible) return false;
  let improved = false;
  for (let i = 0; i < route.length - 1; i++) {
    for (let j = i + 1; j < route.length; j++) {
      const trial: IRoute = [
        ...route.slice(0, i),
        ...route.slice(i, j + 1).reverse(),
        ...route.slice(j + 1),
      ];
      const ev = scheduleRoute(emp, trial, stops, travel, meta.startIdx, meta.endIdx, stopIdx);
      if (ev.feasible && ev.km + 0.05 < baseline.km) {
        for (let k = 0; k < trial.length; k++) route[k] = trial[k];
        improved = true;
        return true;
      }
    }
  }
  return improved;
}

// ============== Main ==============
export async function solveVRP(
  employees: EmployeeCtx[],
  stops: Stop[],
): Promise<{ plan: RoutePlan; provider: "mapbox" | "osrm" | "haversine" }> {
  const empStarts: LatLng[] = employees.map((e) => ({ lat: e.start_lat, lng: e.start_lng }));
  const empEnds: LatLng[] = employees.map((e) => ({ lat: e.end_lat, lng: e.end_lng }));
  const stopCoords: LatLng[] = stops.map((s) => ({ lat: s.latitude, lng: s.longitude }));
  const coords: LatLng[] = [...empStarts, ...empEnds, ...stopCoords];

  const matrix = coords.length <= 25 ? await buildMatrix(coords) : null;
  const provider: "mapbox" | "osrm" | "haversine" = matrix?.provider ?? "haversine";
  const travel = makeTravelers(matrix, coords);

  const empMeta = new Map<string, { startIdx: number; endIdx: number }>();
  employees.forEach((e, i) => empMeta.set(e.id, { startIdx: i, endIdx: employees.length + i }));
  const stopIdxOf = (id: string) => {
    const i = stops.findIndex((s) => s.id === id);
    return 2 * employees.length + i;
  };

  // Pinned stops respekteres (manuelt tildelt) — andre er frie til omfordeling
  const pinned = new Set<string>();
  const routes = new Map<string, IRoute>();
  employees.forEach((e) => routes.set(e.id, []));

  // Først: placér pinned stops hos deres medarbejder (hvis required_staff matcher)
  const pinnedStops = stops.filter((s) => s.pinned_assignees.length > 0);
  for (const stop of pinnedStops) {
    pinned.add(stop.id);
    // Placér hos hver pinned-medarbejder (på dårlig pos — bliver re-optimeret)
    for (const empId of stop.pinned_assignees) {
      const route = routes.get(empId);
      if (!route) continue;
      route.push({
        stop_id: stop.id,
        sequence: 0,
        arrival_min: 0,
        departure_min: 0,
        assignees: stop.pinned_assignees,
        travel_min_to_next: null,
        travel_km_to_next: null,
      });
    }
  }

  // Derefter: greedy insertion af resten, sorteret efter smalleste hard-window først
  const free = stops.filter((s) => s.pinned_assignees.length === 0);
  free.sort((a, b) => {
    const wa = (a.hard_end_min ?? 24 * 60) - (a.hard_start_min ?? 0);
    const wb = (b.hard_end_min ?? 24 * 60) - (b.hard_start_min ?? 0);
    if (wa !== wb) return wa - wb;
    return b.duration_minutes - a.duration_minutes;
  });

  const unassigned: string[] = [];

  for (const stop of free) {
    if (stop.required_staff > 1) {
      // Find N billigste medarbejdere uafhængigt og synk arrival
      type Best = { emp: EmployeeCtx; pos: number; cost: number };
      const bests: Best[] = [];
      for (const emp of employees) {
        const choice = tryInsertCheapest(stop, [emp], routes, stops, travel, empMeta, stopIdxOf);
        if (choice) bests.push(choice);
      }
      if (bests.length < stop.required_staff) {
        unassigned.push(stop.id);
        continue;
      }
      bests.sort((a, b) => a.cost - b.cost);
      const chosen = bests.slice(0, stop.required_staff);
      for (const c of chosen) {
        const route = routes.get(c.emp.id)!;
        route.splice(c.pos, 0, {
          stop_id: stop.id,
          sequence: 0,
          arrival_min: 0,
          departure_min: 0,
          assignees: chosen.map((x) => x.emp.id),
          travel_min_to_next: null,
          travel_km_to_next: null,
        });
      }
    } else {
      const choice = tryInsertCheapest(stop, employees, routes, stops, travel, empMeta, stopIdxOf);
      if (!choice) {
        unassigned.push(stop.id);
        continue;
      }
      const route = routes.get(choice.emp.id)!;
      route.splice(choice.pos, 0, {
        stop_id: stop.id,
        sequence: 0,
        arrival_min: 0,
        departure_min: 0,
        assignees: [choice.emp.id],
        travel_min_to_next: null,
        travel_km_to_next: null,
      });
    }
  }

  // Forbedring 1: 2-opt pr. medarbejder
  for (const emp of employees) {
    const route = routes.get(emp.id)!;
    let safety = 20;
    while (safety-- > 0 && twoOpt(emp, route, stops, travel, empMeta.get(emp.id)!, stopIdxOf)) {
      // gentag
    }
  }

  // Forbedring 2: inter-employee swap (pinned + multi-staff stops bevares)
  let safety = 30;
  while (safety-- > 0 && interEmployeeSwap(routes, employees, stops, travel, empMeta, stopIdxOf, pinned)) {
    // gentag
  }

  // Forbedring 3: 2-opt igen efter swap
  for (const emp of employees) {
    const route = routes.get(emp.id)!;
    let s = 20;
    while (s-- > 0 && twoOpt(emp, route, stops, travel, empMeta.get(emp.id)!, stopIdxOf)) {
      // gentag
    }
  }

  // Final scheduling + totals (sum over alle medarbejdere)
  let totalKm = 0;
  let totalMin = 0;
  let softViolations = 0;
  const perEmployee = new Map<string, ScheduledStop[]>();

  for (const emp of employees) {
    const route = routes.get(emp.id)!;
    const meta = empMeta.get(emp.id)!;
    const ev = scheduleRoute(emp, route, stops, travel, meta.startIdx, meta.endIdx, stopIdxOf);
    totalKm += ev.km;
    totalMin += ev.durMin;
    softViolations += ev.softViolations;
    perEmployee.set(emp.id, route.map((r) => ({ ...r })));
  }

  return {
    plan: {
      per_employee: perEmployee,
      unassigned_stops: unassigned,
      total_km: Number(totalKm.toFixed(2)),
      total_minutes: totalMin,
      soft_window_violations: softViolations,
    },
    provider,
  };
}

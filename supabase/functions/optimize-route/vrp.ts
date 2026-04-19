// Multi-medarbejder VRP med tidsvinduer + arbejdstid.
//
// Strategi: greedy insertion med soft-cost. For hvert stop (sorteret efter
// hårdest constraint først) prøver vi at indsætte det på den billigste position
// hos hver medarbejder, og vælger globalt billigste valg. Cost = ekstra rejsetid
// + straf for soft-window-overtrædelse + straf for ventetid.
//
// Hvis et stop kræver N>1 medarbejdere: vi finder N medarbejdere der alle har
// plads i samme tidsvindue, ellers udsættes stoppet til "unassigned".
//
// Pinned assignees (manuelt tildelt før optimering) respekteres: stoppet
// tilhører de medarbejdere — vi finder bare en god rækkefølge for dem.

import { buildMatrix, travelKm, travelSec } from "./geo.ts";
import type {
  EmployeeCtx,
  LatLng,
  RoutePlan,
  ScheduledStop,
  Stop,
} from "./types.ts";

const SLOT_MIN = 15;
const SOFT_PENALTY_PER_MIN = 2; // 1 min uden for ønsketid = 2 min "kostpris"
const WAIT_PENALTY_PER_MIN = 0.3; // venten er irriterende men ikke katastrofalt
const ceilSnap = (m: number) => Math.ceil(m / SLOT_MIN) * SLOT_MIN;

type Position = {
  employee_id: string;
  insert_index: number; // 0..stops.length
  arrival_min: number;
  added_cost: number;
  added_km: number;
};

function planArrivalAt(
  employee: EmployeeCtx,
  stop: Stop,
  prevDepartureMin: number,
  prevCoords: LatLng,
  matrix: Awaited<ReturnType<typeof buildMatrix>>,
  coords: LatLng[],
  prevIdx: number,
  stopIdx: number,
): { arrival: number; travel_min: number; wait_min: number; window_penalty_min: number; feasible: boolean } {
  const travelMin = Math.round(travelSec(matrix, coords, prevIdx, stopIdx) / 60);
  let earliest = ceilSnap(prevDepartureMin + travelMin);

  // Hårdt nedre vindue
  const hardStart = stop.hard_start_min ?? employee.work_start_min;
  if (earliest < hardStart) earliest = ceilSnap(hardStart);

  // Hårdt øvre vindue
  const hardEnd = stop.hard_end_min ?? employee.work_end_min;
  const finishBy = earliest + stop.duration_minutes;
  if (finishBy > hardEnd) {
    return { arrival: earliest, travel_min: travelMin, wait_min: 0, window_penalty_min: 0, feasible: false };
  }

  // Vente tid (mellem ankomst og prev+travel)
  const wait = earliest - (prevDepartureMin + travelMin);

  // Blødt vindue (ønsketid)
  let penalty = 0;
  if (stop.preferred_start_min != null && earliest < stop.preferred_start_min) {
    penalty += stop.preferred_start_min - earliest;
  }
  if (stop.preferred_end_min != null && earliest > stop.preferred_end_min) {
    penalty += earliest - stop.preferred_end_min;
  }

  return { arrival: earliest, travel_min: travelMin, wait_min: wait, window_penalty_min: penalty, feasible: true };
}

/** Beregn omkostning ved at indsætte `stop` på position `insertIdx` i `route`. */
function evaluateInsertion(
  employee: EmployeeCtx,
  stop: Stop,
  route: ScheduledStop[],
  insertIdx: number,
  matrix: Awaited<ReturnType<typeof buildMatrix>>,
  coords: LatLng[],
  empStartIdx: number,
  empEndIdx: number,
  stopIdxInCoords: number,
  routeStopIdxInCoords: (s: ScheduledStop) => number,
): Position | null {
  // Forrige punkt
  const prev = insertIdx === 0 ? null : route[insertIdx - 1];
  const prevIdx = prev ? routeStopIdxInCoords(prev) : empStartIdx;
  const prevDeparture = prev ? prev.departure_min : employee.work_start_min;
  const prevCoords = coords[prevIdx];

  const planned = planArrivalAt(
    employee,
    stop,
    prevDeparture,
    prevCoords,
    matrix,
    coords,
    prevIdx,
    stopIdxInCoords,
  );
  if (!planned.feasible) return null;

  const newDeparture = planned.arrival + stop.duration_minutes;

  // Næste punkt — push hele kæden bagud hvis nødvendigt
  let pushedExtra = 0;
  if (insertIdx < route.length) {
    let cursor = newDeparture;
    for (let i = insertIdx; i < route.length; i++) {
      const cur = route[i];
      const fromIdx = i === insertIdx ? stopIdxInCoords : routeStopIdxInCoords(route[i - 1]);
      const tMin = Math.round(travelSec(matrix, coords, fromIdx, routeStopIdxInCoords(cur)) / 60);
      const newArrival = ceilSnap(cursor + tMin);
      const hardStart = (cur as any).__hard_start ?? employee.work_start_min;
      const hardEnd = (cur as any).__hard_end ?? employee.work_end_min;
      const arrival = Math.max(newArrival, ceilSnap(hardStart));
      const finish = arrival + (cur.departure_min - cur.arrival_min);
      if (finish > hardEnd) return null;
      pushedExtra += Math.max(0, arrival - cur.arrival_min);
      cursor = finish;
    }
  } else {
    // Sidste — check at vi når hjem inden work_end
    const homeTravelMin = Math.round(travelSec(matrix, coords, stopIdxInCoords, empEndIdx) / 60);
    if (newDeparture + homeTravelMin > employee.work_end_min + 60) {
      // tillad op til 1 times overtid hårdt
      return null;
    }
  }

  // Beregn merafstand (km) for indsættelsen
  const oldKm = prev && insertIdx < route.length
    ? travelKm(matrix, coords, prevIdx, routeStopIdxInCoords(route[insertIdx]))
    : 0;
  const newKm = travelKm(matrix, coords, prevIdx, stopIdxInCoords) +
    (insertIdx < route.length ? travelKm(matrix, coords, stopIdxInCoords, routeStopIdxInCoords(route[insertIdx])) : 0);
  const addedKm = newKm - oldKm;

  const cost =
    planned.travel_min +
    pushedExtra +
    planned.window_penalty_min * SOFT_PENALTY_PER_MIN +
    Math.max(0, planned.wait_min) * WAIT_PENALTY_PER_MIN;

  return {
    employee_id: employee.id,
    insert_index: insertIdx,
    arrival_min: planned.arrival,
    added_cost: cost,
    added_km: addedKm,
  };
}

export async function solveVRP(
  employees: EmployeeCtx[],
  stops: Stop[],
): Promise<{ plan: RoutePlan; provider: "mapbox" | "osrm" | "haversine" }> {
  // Saml alle koordinater i ét array: [...emp_starts, ...emp_ends, ...stops]
  // For at holde os under 25-grænsen: hvis vi har for mange, springer vi matrix over.
  const empStarts: LatLng[] = employees.map((e) => ({ lat: e.start_lat, lng: e.start_lng }));
  const empEnds: LatLng[] = employees.map((e) => ({ lat: e.end_lat, lng: e.end_lng }));
  const stopCoords: LatLng[] = stops.map((s) => ({ lat: s.latitude, lng: s.longitude }));
  const coords: LatLng[] = [...empStarts, ...empEnds, ...stopCoords];

  const matrix = coords.length <= 25 ? await buildMatrix(coords) : null;
  const provider: "mapbox" | "osrm" | "haversine" = matrix?.provider ?? "haversine";

  const empStartIdx = (i: number) => i;
  const empEndIdx = (i: number) => employees.length + i;
  const stopIdx = (i: number) => 2 * employees.length + i;

  // Per-medarbejder rute (med ekstra felter til hard windows)
  const routes = new Map<string, (ScheduledStop & { __hard_start?: number; __hard_end?: number })[]>();
  employees.forEach((e) => routes.set(e.id, []));

  // Sortér stops: pinned først (skal placeres uanset hvad), derefter dem med
  // smalle hårde vinduer, derefter resten efter længste varighed.
  const sortedStops = [...stops].sort((a, b) => {
    const pa = a.pinned_assignees.length > 0 ? 1 : 0;
    const pb = b.pinned_assignees.length > 0 ? 1 : 0;
    if (pa !== pb) return pb - pa;
    const wa = (a.hard_end_min ?? 24 * 60) - (a.hard_start_min ?? 0);
    const wb = (b.hard_end_min ?? 24 * 60) - (b.hard_start_min ?? 0);
    if (wa !== wb) return wa - wb;
    return b.duration_minutes - a.duration_minutes;
  });

  const unassigned: string[] = [];

  for (let si = 0; si < sortedStops.length; si++) {
    const stop = sortedStops[si];
    const realIdx = stops.indexOf(stop);
    const stopCoordIdx = stopIdx(realIdx);

    // Bestem kandidat-medarbejdere
    const candidates = stop.pinned_assignees.length > 0
      ? employees.filter((e) => stop.pinned_assignees.includes(e.id))
      : employees;

    if (candidates.length < stop.required_staff) {
      unassigned.push(stop.id);
      continue;
    }

    // For hver kandidat: find billigste indsættelsesposition
    type Eval = { emp: EmployeeCtx; pos: Position };
    const evaluations: Eval[] = [];
    for (const emp of candidates) {
      const empIdx = employees.indexOf(emp);
      const route = routes.get(emp.id)!;
      let best: Position | null = null;
      for (let pos = 0; pos <= route.length; pos++) {
        const cand = evaluateInsertion(
          emp,
          stop,
          route,
          pos,
          matrix,
          coords,
          empStartIdx(empIdx),
          empEndIdx(empIdx),
          stopCoordIdx,
          (s) => stopIdx(stops.indexOf(stops.find((x) => x.id === s.stop_id)!)),
        );
        if (cand && (!best || cand.added_cost < best.added_cost)) best = cand;
      }
      if (best) evaluations.push({ emp, pos: best });
    }

    if (evaluations.length < stop.required_staff) {
      unassigned.push(stop.id);
      continue;
    }

    // Vælg de N billigste medarbejdere; men de skal alle have samme arrival_min
    // → vi tager den dyreste arrival_min blandt de N billigste, og bruger den.
    evaluations.sort((a, b) => a.pos.added_cost - b.pos.added_cost);
    const chosen = evaluations.slice(0, stop.required_staff);
    const synchedArrival = Math.max(...chosen.map((c) => c.pos.arrival_min));

    // Indsæt hos hver valgt medarbejder med den synkroniserede ankomst
    for (const { emp, pos } of chosen) {
      const route = routes.get(emp.id)!;
      // Re-evaluer med synchedArrival hvis vi er forsinket
      const arrival = Math.max(synchedArrival, pos.arrival_min);
      const newStop: ScheduledStop & { __hard_start?: number; __hard_end?: number } = {
        stop_id: stop.id,
        sequence: 0, // sættes senere
        arrival_min: arrival,
        departure_min: arrival + stop.duration_minutes,
        assignees: chosen.map((c) => c.emp.id),
        travel_min_to_next: null,
        travel_km_to_next: null,
        __hard_start: stop.hard_start_min ?? undefined,
        __hard_end: stop.hard_end_min ?? undefined,
      };
      route.splice(pos.insert_index, 0, newStop);
      // Re-rebuild kæden bagud for at sikre konsistens
      rebuildChain(emp, route, employees.indexOf(emp), matrix, coords, stops, empStartIdx, empEndIdx, stopIdx);
    }
  }

  // Beregn totals + travel-til-næste
  let totalKm = 0;
  let totalMin = 0;
  let softViolations = 0;
  const perEmployee = new Map<string, ScheduledStop[]>();

  for (const emp of employees) {
    const route = routes.get(emp.id)!;
    const empIdx = employees.indexOf(emp);
    if (route.length === 0) {
      perEmployee.set(emp.id, []);
      continue;
    }
    // travel til første stop fra start
    const firstStop = stops.find((s) => s.id === route[0].stop_id)!;
    totalKm += travelKm(matrix, coords, empStartIdx(empIdx), stopIdx(stops.indexOf(firstStop)));

    for (let i = 0; i < route.length; i++) {
      const cur = route[i];
      const curStop = stops.find((s) => s.id === cur.stop_id)!;
      cur.sequence = i;

      if (i < route.length - 1) {
        const next = route[i + 1];
        const nextStop = stops.find((s) => s.id === next.stop_id)!;
        const tSec = travelSec(matrix, coords, stopIdx(stops.indexOf(curStop)), stopIdx(stops.indexOf(nextStop)));
        const tKm = travelKm(matrix, coords, stopIdx(stops.indexOf(curStop)), stopIdx(stops.indexOf(nextStop)));
        cur.travel_min_to_next = Math.round(tSec / 60);
        cur.travel_km_to_next = Number(tKm.toFixed(2));
        totalKm += tKm;
      } else {
        // Sidste stop -> hjem/firma
        const tKm = travelKm(matrix, coords, stopIdx(stops.indexOf(curStop)), empEndIdx(empIdx));
        totalKm += tKm;
      }

      // Soft-window check
      if (curStop.preferred_start_min != null && cur.arrival_min < curStop.preferred_start_min) softViolations++;
      if (curStop.preferred_end_min != null && cur.arrival_min > curStop.preferred_end_min) softViolations++;
    }

    const lastDeparture = route[route.length - 1].departure_min;
    totalMin = Math.max(totalMin, lastDeparture - emp.work_start_min);
    perEmployee.set(emp.id, route.map((r) => ({
      stop_id: r.stop_id,
      sequence: r.sequence,
      arrival_min: r.arrival_min,
      departure_min: r.departure_min,
      assignees: r.assignees,
      travel_min_to_next: r.travel_min_to_next,
      travel_km_to_next: r.travel_km_to_next,
    })));
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

function rebuildChain(
  emp: EmployeeCtx,
  route: (ScheduledStop & { __hard_start?: number; __hard_end?: number })[],
  empIdx: number,
  matrix: Awaited<ReturnType<typeof buildMatrix>>,
  coords: LatLng[],
  stops: Stop[],
  empStartIdx: (i: number) => number,
  _empEndIdx: (i: number) => number,
  stopIdx: (i: number) => number,
) {
  let cursor = emp.work_start_min;
  let prevIdx = empStartIdx(empIdx);
  for (const r of route) {
    const stop = stops.find((s) => s.id === r.stop_id)!;
    const myIdx = stopIdx(stops.indexOf(stop));
    const tMin = Math.round(travelSec(matrix, coords, prevIdx, myIdx) / 60);
    const arrival = Math.max(ceilSnap(cursor + tMin), ceilSnap(stop.hard_start_min ?? emp.work_start_min));
    r.arrival_min = arrival;
    r.departure_min = arrival + stop.duration_minutes;
    cursor = r.departure_min;
    prevIdx = myIdx;
  }
}

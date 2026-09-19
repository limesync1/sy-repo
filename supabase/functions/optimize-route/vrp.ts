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

import { buildMatrix, travelKm, travelSec, haversineKm, haversineSec, getWeatherAdjustment, applyDurationMultiplier } from "./geo.ts";
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
/** Vægt på km i den samlede cost-funktion. Cost måles i minutter, så en vægt
 *  på 0.6 betyder at 1 km "koster" 0,6 minut oveni den faktiske køretid.
 *  Det holder ruten geografisk samlet, men lader KØRETID være det der vejer
 *  tungest — det er det "Optimér rute" lover brugeren. (Var 1.5, hvilket
 *  gjorde optimeringen til en ren afstands-optimering.) */
const KM_COST_WEIGHT = 0.6;
/** Straf for at splitte stops på samme adresse op. To stops med samme
 *  GPS-koordinat (samme kunde / samme bygning) bør ALTID køres lige efter
 *  hinanden — også hvis en anden adresse rent kørselsmæssigt ligger på
 *  vejen. Penalty pr. "genåbning" af en allerede besøgt adresse-klynge er
 *  meget høj, så optimeren aldrig sender medarbejderen tilbage til en
 *  adresse den lige har forladt. */
const SAME_LOCATION_PENALTY = 2000;
/** Rund GPS til ~11 m for at fange "samme adresse" på trods af lille jitter
 *  i geokoderen (forskellige indgange, naboparkeringer osv.). */
const locationKey = (s: Stop): string => {
  // Foretræk normaliseret adresse-nøgle hvis sat — den fanger "samme bygning"
  // selv hvis hver aftale er geokodet til en lidt anden indgang. Falder
  // tilbage til GPS rundet til ~110 m hvis cluster_key mangler.
  if (s.cluster_key && s.cluster_key.length > 0) return s.cluster_key;
  return `${s.latitude.toFixed(3)},${s.longitude.toFixed(3)}`;
};
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
  // Track sidste position vi besøgte hver adresse-klynge. Hvis vi
  // forlader en klynge og vender tilbage senere → tilføj kraftig straf,
  // så ruter med 3 stops på samme adresse altid bliver kørt samlet.
  const lastIdxByLocation = new Map<string, number>();
  let fragmentationCount = 0;

  for (let i = 0; i < route.length; i++) {
    const r = route[i];
    const stop = stops.find((s) => s.id === r.stop_id);
    if (!stop) return { feasible: false, cost: Infinity, km: 0, durMin: 0, softViolations: 0 };
    const locKey = locationKey(stop);
    const lastLocIdx = lastIdxByLocation.get(locKey);
    if (lastLocIdx !== undefined && lastLocIdx !== i - 1) {
      // Vi har forladt denne adresse og kommer nu tilbage til den —
      // tæl én "genåbning" pr. mellemliggende stop, så split af 3+
      // stops på samme adresse straffes proportionalt.
      fragmentationCount += 1;
    }
    lastIdxByLocation.set(locKey, i);
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
    cost += travelMin + tKm * KM_COST_WEIGHT + wait * WAIT_PENALTY_PER_MIN;

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

  // Sidste leg hjem skal tælle med i både tid og cost. Tidligere talte kun
  // kilometerne, så optimeren kunne vælge en langsom afslutning på små veje,
  // selv når en hurtigere hjemtur fandtes.
  let returnTravelMin = 0;
  if (route.length > 0) {
    returnTravelMin = Math.round(travel.sec(prevIdx, empEndIdx) / 60);
    const homeKm = travel.km(prevIdx, empEndIdx);
    totalKm += homeKm;
    cost += returnTravelMin + homeKm * KM_COST_WEIGHT;
  }

  // Tilføj samme-adresse-strafgebyret til den samlede cost. Penalty er
  // højt nok til at dominere selv flere km kørsel — så det er aldrig
  // værd at splitte en klynge ad for at spare lidt vej.
  if (fragmentationCount > 0) {
    cost += fragmentationCount * SAME_LOCATION_PENALTY;
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

  const durMin = route.length > 0 ? cursor - emp.work_start_min + returnTravelMin : 0;
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
      // scheduleRoute.cost indeholder allerede både reel køretid og km-vægt.
      // En ekstra km-straf her gjorde den indledende løsning afstandstung.
      const delta = ev.cost - baseline.cost;
      if (!best || delta < best.cost) best = { emp, pos, cost: delta };
    }
  }
  return best;
}

// ============== Inter-employee swap pass ==============
// Flytter ét stop fra medarbejder A til den optimale position hos medarbejder B.
// Vi accepterer kun flytningen hvis den GLOBALE cost (sum over A+B) falder
// målbart. Den gamle implementering havde en bug hvor `bestKmB` blev brugt
// dobbelt i regnestykket — derfor blev rigtige forbedringer ofte forkastet.
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
      if (!baseA.feasible) continue;

      for (const empB of employees) {
        if (empB.id === empA.id) continue;
        const routeB = routes.get(empB.id)!;
        const metaB = empMeta.get(empB.id)!;
        const baseB = scheduleRoute(empB, routeB, stops, travel, metaB.startIdx, metaB.endIdx, stopIdx);
        if (!baseB.feasible) continue;
        const baselineCost = baseA.cost + baseB.cost;

        // Fjern stop fra A
        const newA = [...routeA.slice(0, i), ...routeA.slice(i + 1)];
        const evA = scheduleRoute(empA, newA, stops, travel, metaA.startIdx, metaA.endIdx, stopIdx);
        if (!evA.feasible) continue;

        // Find bedste position i B
        let bestPos = -1;
        let bestCostB = Infinity;
        for (let p = 0; p <= routeB.length; p++) {
          const trial: IRoute = [
            ...routeB.slice(0, p),
            { ...routeA[i], assignees: [empB.id] },
            ...routeB.slice(p),
          ];
          const ev = scheduleRoute(empB, trial, stops, travel, metaB.startIdx, metaB.endIdx, stopIdx);
          if (!ev.feasible) continue;
          if (ev.cost < bestCostB) {
            bestCostB = ev.cost;
            bestPos = p;
          }
        }
        if (bestPos < 0) continue;

        const totalNew = evA.cost + bestCostB;
        // Kræv mindst 1 cost-enhed forbedring så vi ikke flipper frem og tilbage
        // pga. afrundinger.
        if (totalNew + 0.5 < baselineCost) {
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
      // Cost-baseret accept (km + tid + ventetid + soft-vinduer) — ren km-sammenligning
      // forkastede tit gode swaps der overholdt et tidsvindue bedre.
      if (ev.feasible && ev.cost + 0.5 < baseline.cost) {
        for (let k = 0; k < trial.length; k++) route[k] = trial[k];
        improved = true;
        return true;
      }
    }
  }
  return improved;
}

// ============== Relocate pr. medarbejder ==============
// Tager et stop ud og prøver at sætte det ind på enhver anden position i samme
// rute. Fanger "kører frem og tilbage" mønstre som 2-opt ikke kan fjerne fordi
// de ikke involverer reversering af et segment.
function relocateInRoute(
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
  for (let i = 0; i < route.length; i++) {
    const removed = route[i];
    const without: IRoute = [...route.slice(0, i), ...route.slice(i + 1)];
    for (let j = 0; j <= without.length; j++) {
      if (j === i) continue;
      const trial: IRoute = [...without.slice(0, j), removed, ...without.slice(j)];
      const ev = scheduleRoute(emp, trial, stops, travel, meta.startIdx, meta.endIdx, stopIdx);
      if (ev.feasible && ev.cost + 0.5 < baseline.cost) {
        for (let k = 0; k < trial.length; k++) route[k] = trial[k];
        return true;
      }
    }
  }
  return false;
}

// ============== Main ==============
export async function solveVRP(
  employeesIn: EmployeeCtx[],
  stopsIn: Stop[],
  opts: { routeDate?: string | null } = {},
): Promise<{
  plan: RoutePlan;
  provider: "mapbox" | "osrm" | "haversine";
  weather: { multiplier: number; summary: string | null };
  current: { total_km: number; total_minutes: number; feasible: boolean; stop_order: string[] };
}> {
  // === DETERMINISME ===
  // Algoritmen er i sig selv deterministisk, men resultatet afhænger af
  // *rækkefølgen* på input (greedy insertion vælger første stop først, osv).
  // For at samme rute ALTID giver samme resultat — uanset hvordan DB returnerer
  // rækken — sorterer vi input kanonisk på ID før vi kører.
  const employees = [...employeesIn].sort((a, b) => a.id.localeCompare(b.id));
  const stops = [...stopsIn]
    .map((s) => ({
      ...s,
      // Sortér også pinned_assignees så input-hash er stabil
      pinned_assignees: [...s.pinned_assignees].sort(),
    }));
  const clusterCounts = new Map<string, number>();
  for (const stop of stops) {
    const key = locationKey(stop);
    clusterCounts.set(key, (clusterCounts.get(key) ?? 0) + 1);
  }
  stops.sort((a, b) => {
    const ca = clusterCounts.get(locationKey(a)) ?? 1;
    const cb = clusterCounts.get(locationKey(b)) ?? 1;
    if (ca !== cb) return cb - ca;
    const ka = locationKey(a);
    const kb = locationKey(b);
    if (ka !== kb) return ka.localeCompare(kb);
    return a.id.localeCompare(b.id);
  });

  const empStarts: LatLng[] = employees.map((e) => ({ lat: e.start_lat, lng: e.start_lng }));
  const empEnds: LatLng[] = employees.map((e) => ({ lat: e.end_lat, lng: e.end_lng }));
  const stopCoords: LatLng[] = stops.map((s) => ({ lat: s.latitude, lng: s.longitude }));
  const coords: LatLng[] = [...empStarts, ...empEnds, ...stopCoords];

  // buildMatrix henter nu også rigtige køretider for ruter med mere end 25
  // punkter (i fliser). Kun hvis alle opslag fejler falder vi til fugleflugt.
  const matrix = await buildMatrix(coords);
  const provider: "mapbox" | "osrm" | "haversine" = matrix?.provider ?? "haversine";

  // === Vejr-justering ===
  // Hent prognose for rute-dagen og brug den som hastigheds-multiplier
  // på rejsetid. Dette giver mere realistisk planlægning ved regn/sne/glat
  // føre. Mapbox's driving-traffic-profil dækker allerede normal trafik,
  // så vi rører kun durations — distancer er uændrede.
  let weather: { multiplier: number; summary: string | null } = { multiplier: 1.0, summary: null };
  if (opts.routeDate && coords.length > 0) {
    weather = await getWeatherAdjustment(coords[0], opts.routeDate);
    if (matrix && weather.multiplier !== 1.0) {
      applyDurationMultiplier(matrix, weather.multiplier);
    }
  }

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

  // Baseline: mål den rækkefølge brugeren ser lige nu med samme trafik-/vejr-
  // matrix som optimeringen. Tidligere brugte vi routes.total_* fra sidste
  // optimering, så en manuelt ændret rækkefølge kunne give 0 i besparelse og
  // fejlagtigt blive vist som "allerede optimal".
  const currentRoutes = new Map<string, IRoute>();
  employees.forEach((e) => currentRoutes.set(e.id, []));
  const stopById = new Map(stops.map((s) => [s.id, s]));
  for (const original of stopsIn) {
    const stop = stopById.get(original.id);
    if (!stop) continue;
    let empIds = stop.pinned_assignees.filter((id) => currentRoutes.has(id));
    if (empIds.length === 0) {
      empIds = employees.slice(0, Math.max(1, Math.min(stop.required_staff, employees.length))).map((e) => e.id);
    }
    for (const empId of empIds) {
      currentRoutes.get(empId)?.push({
        stop_id: stop.id,
        sequence: 0,
        arrival_min: 0,
        departure_min: 0,
        assignees: empIds,
        travel_min_to_next: null,
        travel_km_to_next: null,
      });
    }
  }

  let currentKm = 0;
  let currentMin = 0;
  let currentFeasible = true;
  for (const emp of employees) {
    const route = currentRoutes.get(emp.id)!;
    const meta = empMeta.get(emp.id)!;
    const ev = scheduleRoute(emp, route, stops, travel, meta.startIdx, meta.endIdx, stopIdxOf);
    if (!ev.feasible) {
      currentFeasible = false;
      continue;
    }
    currentKm += ev.km;
    currentMin += ev.durMin;
  }
  const current = {
    total_km: Number(currentKm.toFixed(2)),
    total_minutes: currentMin,
    feasible: currentFeasible,
    stop_order: stopsIn.map((s) => s.id),
  };

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
    const ca = clusterCounts.get(locationKey(a)) ?? 1;
    const cb = clusterCounts.get(locationKey(b)) ?? 1;
    if (ca !== cb) return cb - ca;
    const ka = locationKey(a);
    const kb = locationKey(b);
    if (ka !== kb) return ka.localeCompare(kb);
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

  // Iterativ forbedring: kør 2-opt + relocate + inter-swap indtil ingen
  // af dem længere kan finde forbedring. Sikrer at swap mellem medarbejdere
  // og lokal omrokering arbejder sammen i stedet for sekventielt.
  let outer = 8; // max ydre iterationer (typisk 2-3 nok)
  let anyImproved = true;
  while (outer-- > 0 && anyImproved) {
    anyImproved = false;

    // 2-opt pr. medarbejder
    for (const emp of employees) {
      const route = routes.get(emp.id)!;
      let safety = 30;
      while (safety-- > 0 && twoOpt(emp, route, stops, travel, empMeta.get(emp.id)!, stopIdxOf)) {
        anyImproved = true;
      }
    }

    // Relocate pr. medarbejder (fanger frem-og-tilbage-mønstre)
    for (const emp of employees) {
      const route = routes.get(emp.id)!;
      let safety = 30;
      while (safety-- > 0 && relocateInRoute(emp, route, stops, travel, empMeta.get(emp.id)!, stopIdxOf)) {
        anyImproved = true;
      }
    }

    // Inter-employee swap
    let safety = 50;
    while (safety-- > 0 && interEmployeeSwap(routes, employees, stops, travel, empMeta, stopIdxOf, pinned)) {
      anyImproved = true;
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
    weather,
    current,
  };
}

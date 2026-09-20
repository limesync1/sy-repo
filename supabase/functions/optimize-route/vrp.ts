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

import { buildMatrix, roadKm, haversineSec, getWeatherAdjustment, applyDurationMultiplier } from "./geo.ts";
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
  const n = coords.length;
  // Memoiser fallback-beregninger: local search kalder de samme par mange
  // tusinde gange, og trigonometri pr. opslag var en reel flaskehals på
  // ruter med 20+ stop.
  const secCache = new Float64Array(n * n).fill(-1);
  const kmCache = new Float64Array(n * n).fill(-1);
  const sec = (i: number, j: number) => {
    if (i === j) return 0;
    if (matrix && i < matrix.durations.length && j < matrix.durations.length) {
      const v = matrix.durations[i][j];
      if (typeof v === "number" && Number.isFinite(v)) return v;
    }
    const k = i * n + j;
    if (secCache[k] >= 0) return secCache[k];
    const v = haversineSec(coords[i], coords[j]);
    secCache[k] = v;
    return v;
  };
  const km = (i: number, j: number) => {
    if (i === j) return 0;
    if (matrix && i < matrix.distances.length && j < matrix.distances.length) {
      const v = matrix.distances[i][j];
      if (typeof v === "number" && Number.isFinite(v)) return v / 1000;
    }
    const k = i * n + j;
    if (kmCache[k] >= 0) return kmCache[k];
    const v = roadKm(coords[i], coords[j]);
    kmCache[k] = v;
    return v;
  };
  return { sec, km };
}

// ============== Schedule a route (compute arrivals/departures from scratch) ==============
/** id → Stop-opslag, cachet pr. stops-array (local search kalder det massivt). */
const stopMapCache = new WeakMap<Stop[], Map<string, Stop>>();
const stopMapOf = (stops: Stop[]): Map<string, Stop> => {
  let m = stopMapCache.get(stops);
  if (!m) {
    m = new Map(stops.map((s) => [s.id, s]));
    stopMapCache.set(stops, m);
  }
  return m;
};

function scheduleRoute(
  emp: EmployeeCtx,
  route: IRoute,
  stops: Stop[],
  travel: ReturnType<typeof makeTravelers>,
  empStartIdx: number,
  empEndIdx: number,
  stopIdx: (id: string) => number,
): { feasible: boolean; cost: number; km: number; durMin: number; softViolations: number } {
  const byId = stopMapOf(stops);
  // VIGTIGT: tid regnes i hele minutter UDEN 15-minutters-afrunding.
  // Afrundingen blev tidligere brugt hele vejen igennem, hvilket gjorde at
  // to vidt forskellige rækkefølger fik nøjagtig samme cost (alt blev
  // rundet op i samme slot) — og så kunne optimeringen ikke se hvilken der
  // var bedst. Den viste ankomsttid rundes stadig op til nærmeste kvarter,
  // men kun til visning.
  let cursor = emp.work_start_min;
  let prevIdx = empStartIdx;
  let totalKm = 0;
  let cost = 0;
  let softViolations = 0;
  const lastIdxByLocation = new Map<string, number>();
  let fragmentationCount = 0;

  for (let i = 0; i < route.length; i++) {
    const r = route[i];
    const stop = byId.get(r.stop_id);
    if (!stop) return { feasible: false, cost: Infinity, km: 0, durMin: 0, softViolations: 0 };
    const locKey = locationKey(stop);
    const lastLocIdx = lastIdxByLocation.get(locKey);
    if (lastLocIdx !== undefined && lastLocIdx !== i - 1) {
      // Vi har forladt denne adresse og kommer nu tilbage til den.
      fragmentationCount += 1;
    }
    lastIdxByLocation.set(locKey, i);
    const myIdx = stopIdx(stop.id);
    const travelMin = travel.sec(prevIdx, myIdx) / 60;
    const tKm = travel.km(prevIdx, myIdx);
    totalKm += tKm;

    let arrival = cursor + travelMin;
    const hardStart = stop.hard_start_min ?? emp.work_start_min;
    if (arrival < hardStart) arrival = hardStart;
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

    // Visning: ankomst rundes op til nærmeste kvarter, afgang = ankomst + varighed.
    const shownArrival = ceilSnap(arrival);
    r.arrival_min = shownArrival;
    r.departure_min = shownArrival + stop.duration_minutes;
    r.sequence = i;
    cursor = finish;
    prevIdx = myIdx;

    r.travel_min_to_next = null;
    r.travel_km_to_next = null;
  }

  // Sidste leg hjem tæller med i både tid og cost.
  let returnTravelMin = 0;
  if (route.length > 0) {
    returnTravelMin = travel.sec(prevIdx, empEndIdx) / 60;
    const homeKm = travel.km(prevIdx, empEndIdx);
    totalKm += homeKm;
    cost += returnTravelMin + homeKm * KM_COST_WEIGHT;
  }

  if (fragmentationCount > 0) {
    cost += fragmentationCount * SAME_LOCATION_PENALTY;
  }

  // Sæt travel-til-næste på hver stop (i → i+1)
  for (let i = 0; i < route.length - 1; i++) {
    const ai = stopIdx(route[i].stop_id);
    const bi = stopIdx(route[i + 1].stop_id);
    route[i].travel_min_to_next = Math.round(travel.sec(ai, bi) / 60);
    route[i].travel_km_to_next = Number(travel.km(ai, bi).toFixed(2));
  }
  if (route.length > 0) {
    const last = route[route.length - 1];
    const li = stopIdx(last.stop_id);
    last.travel_min_to_next = Math.round(travel.sec(li, empEndIdx) / 60);
    last.travel_km_to_next = Number(travel.km(li, empEndIdx).toFixed(2));
  }

  const durMin = route.length > 0 ? Math.round(cursor - emp.work_start_min + returnTravelMin) : 0;
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

// ============== Or-opt: flyt sammenhængende segmenter (1-3 stop) ==============
// Relocate flytter kun ét stop ad gangen. Or-opt flytter hele små kæder —
// fx to nabostop der tilsammen ligger forkert i ruten — og kan også vende
// segmentet. Det er netop dét mønster der giver "kør langt væk og tilbage".
function orOpt(
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

  for (let len = Math.min(3, route.length - 1); len >= 1; len--) {
    for (let i = 0; i + len <= route.length; i++) {
      const seg = route.slice(i, i + len);
      const rest: IRoute = [...route.slice(0, i), ...route.slice(i + len)];
      for (let j = 0; j <= rest.length; j++) {
        if (j === i) continue;
        for (const reversed of [false, true]) {
          if (reversed && len === 1) continue;
          const piece = reversed ? [...seg].reverse() : seg;
          const trial: IRoute = [...rest.slice(0, j), ...piece, ...rest.slice(j)];
          const ev = scheduleRoute(emp, trial, stops, travel, meta.startIdx, meta.endIdx, stopIdx);
          if (ev.feasible && ev.cost + 0.25 < baseline.cost) {
            for (let k = 0; k < trial.length; k++) route[k] = trial[k];
            return true;
          }
        }
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
  provider: "osrm" | "haversine";
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
  const provider: "osrm" | "haversine" = matrix?.provider ?? "haversine";

  // === Vejr-justering ===
  // Hent prognose for rute-dagen og brug den som hastigheds-multiplier
  // på rejsetid. Dette giver mere realistisk planlægning ved regn/sne/glat
  // føre. Den nøglefri rutetjeneste dækker ikke live trafik,
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
  const stopPos = new Map(stops.map((s, i) => [s.id, 2 * employees.length + i]));
  const stopIdxOf = (id: string) => stopPos.get(id) ?? -1;

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

  for (const stop of stops) {
    if (stop.pinned_assignees.length > 0) pinned.add(stop.id);
  }

  const free = stops.filter((s) => s.pinned_assignees.length === 0);

  // Rækkefølgen stop indsættes i afgør hvor god startløsningen bliver.
  // Vi prøver flere forskellige rækkefølger (seeds) og beholder den
  // billigste efter lokal forbedring. Det er dét der fjerner "kør langt
  // væk først"-ruterne som én enkelt grådig rækkefølge ofte producerer.
  const windowWidth = (s: Stop) => (s.hard_end_min ?? 24 * 60) - (s.hard_start_min ?? 0);
  const tieBreak = (a: Stop, b: Stop) => {
    const ca = clusterCounts.get(locationKey(a)) ?? 1;
    const cb = clusterCounts.get(locationKey(b)) ?? 1;
    if (ca !== cb) return cb - ca;
    const ka = locationKey(a);
    const kb = locationKey(b);
    if (ka !== kb) return ka.localeCompare(kb);
    return a.id.localeCompare(b.id);
  };

  // Seed 1: smalleste tidsvindue først (som hidtil).
  const seedWindow = [...free].sort((a, b) => {
    const d = windowWidth(a) - windowWidth(b);
    if (d !== 0) return d;
    const t = tieBreak(a, b);
    if (t !== 0) return t;
    return b.duration_minutes - a.duration_minutes;
  });
  // Seed 2: længst væk fra depotet først (klassisk "farthest first" — giver
  // ofte en meget bedre ramme som de nære stop kan sys ind i).
  const depot: LatLng = employees.length > 0
    ? { lat: employees[0].start_lat, lng: employees[0].start_lng }
    : { lat: 0, lng: 0 };
  const distFromDepot = new Map(free.map((s) => [s.id, roadKm(depot, { lat: s.latitude, lng: s.longitude })]));
  const seedFar = [...free].sort((a, b) => {
    const d = (distFromDepot.get(b.id) ?? 0) - (distFromDepot.get(a.id) ?? 0);
    if (Math.abs(d) > 0.01) return d;
    return tieBreak(a, b);
  });
  // Seed 3: nærmeste-nabo-kæde fra depotet.
  const seedNn: Stop[] = [];
  {
    const pool = [...free].sort(tieBreak);
    let cur = depot;
    while (pool.length > 0) {
      let bi = 0;
      let bd = Infinity;
      for (let i = 0; i < pool.length; i++) {
        const d = roadKm(cur, { lat: pool[i].latitude, lng: pool[i].longitude });
        if (d < bd - 0.001) { bd = d; bi = i; }
      }
      const [next] = pool.splice(bi, 1);
      seedNn.push(next);
      cur = { lat: next.latitude, lng: next.longitude };
    }
  }

  const buildRoutes = (order: Stop[]): { routes: Map<string, IRoute>; unassigned: string[]; cost: number } => {
    const r = new Map<string, IRoute>();
    employees.forEach((e) => r.set(e.id, []));
    // Pinned stops placeres først hos deres medarbejder — de omplaceres af
    // lokal søgning bagefter, men bliver hos den rigtige person.
    for (const stop of stops) {
      if (stop.pinned_assignees.length === 0) continue;
      for (const empId of stop.pinned_assignees) {
        r.get(empId)?.push({
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

    const unassignedIds: string[] = [];
    for (const stop of order) {
      if (stop.required_staff > 1) {
        type Best = { emp: EmployeeCtx; pos: number; cost: number };
        const bests: Best[] = [];
        for (const emp of employees) {
          const choice = tryInsertCheapest(stop, [emp], r, stops, travel, empMeta, stopIdxOf);
          if (choice) bests.push(choice);
        }
        if (bests.length < stop.required_staff) {
          unassignedIds.push(stop.id);
          continue;
        }
        bests.sort((a, b) => (a.cost - b.cost) || a.emp.id.localeCompare(b.emp.id));
        const chosen = bests.slice(0, stop.required_staff);
        for (const c of chosen) {
          r.get(c.emp.id)!.splice(c.pos, 0, {
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
        const choice = tryInsertCheapest(stop, employees, r, stops, travel, empMeta, stopIdxOf);
        if (!choice) {
          unassignedIds.push(stop.id);
          continue;
        }
        r.get(choice.emp.id)!.splice(choice.pos, 0, {
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

    // Lokal forbedring: 2-opt + or-opt + relocate pr. medarbejder, og
    // omfordeling mellem medarbejdere — indtil intet forbedres.
    let outer = 8;
    let anyImproved = true;
    while (outer-- > 0 && anyImproved) {
      anyImproved = false;
      for (const emp of employees) {
        const route = r.get(emp.id)!;
        const meta = empMeta.get(emp.id)!;
        let safety = 40;
        while (safety-- > 0 && twoOpt(emp, route, stops, travel, meta, stopIdxOf)) anyImproved = true;
        safety = 40;
        while (safety-- > 0 && orOpt(emp, route, stops, travel, meta, stopIdxOf)) anyImproved = true;
        safety = 40;
        while (safety-- > 0 && relocateInRoute(emp, route, stops, travel, meta, stopIdxOf)) anyImproved = true;
      }
      if (employees.length > 1) {
        let safety = 50;
        while (safety-- > 0 && interEmployeeSwap(r, employees, stops, travel, empMeta, stopIdxOf, pinned)) {
          anyImproved = true;
        }
      }
    }

    let cost = 0;
    for (const emp of employees) {
      const meta = empMeta.get(emp.id)!;
      const ev = scheduleRoute(emp, r.get(emp.id)!, stops, travel, meta.startIdx, meta.endIdx, stopIdxOf);
      cost += ev.feasible ? ev.cost : 1e9;
    }
    // Ikke-placerede stop er dyrere end enhver omvej.
    cost += unassignedIds.length * 1e6;
    return { routes: r, unassigned: unassignedIds, cost };
  };

  const seeds = [seedWindow, seedFar, seedNn];
  let bestSolution = buildRoutes(seeds[0]);
  for (let i = 1; i < seeds.length; i++) {
    const cand = buildRoutes(seeds[i]);
    if (cand.cost + 0.01 < bestSolution.cost) bestSolution = cand;
  }
  for (const emp of employees) routes.set(emp.id, bestSolution.routes.get(emp.id)!);
  const unassigned = bestSolution.unassigned;

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

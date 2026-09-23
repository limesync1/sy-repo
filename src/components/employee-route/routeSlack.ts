/**
 * Slæk-beregning for en rute under kørsel.
 *
 * Formålet: kunne svare præcist på "hvilke stop kan jeg flytte rundt på
 * uden at komme for sent til et aftalt tidsvindue?" — og hvor meget.
 *
 * Alt regnes i minutter siden midnat (lokal tid). Rejsetid estimeres med
 * samme model som ruteoptimeringen på serveren (fugleflugt × omvejsfaktor
 * og en fart der afhænger af turens længde), så tal i app og backend
 * peger samme vej.
 */

import { haversineMeters } from "@/lib/geo-distance";

export const ROAD_DETOUR_FACTOR = 1.3;

export type FlexStop = {
  id: string;
  status?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  duration_minutes?: number | null;
  planned_arrival?: string | null;
  time_window_start?: string | null;
  time_window_end?: string | null;
};

export type FlexLevel = "late" | "fixed" | "tight" | "flexible";

export type StopFlex = {
  id: string;
  /** Forventet ankomst (minutter siden midnat). */
  arrivalMin: number;
  /** Seneste tilladte ankomst, hvis der er et tidsvindue. */
  latestMin: number | null;
  /** Hvor mange minutter stoppet (og resten af kæden) kan skubbes. */
  slackMin: number | null;
  level: FlexLevel;
  /** Kort dansk mærkat til UI. */
  label: string;
};

export type OrderSim = {
  totalKm: number;
  /** Køretid + servicetid i minutter. */
  totalMin: number;
  driveMin: number;
  /** Antal stop der ankommer efter deres tidsvindue. */
  violations: number;
  arrivals: number[];
};

/** Vejafstand i km (fugleflugt × omvejsfaktor). */
export const roadKm = (
  a: [number, number],
  b: [number, number],
): number => (haversineMeters(a[0], a[1], b[0], b[1]) / 1000) * ROAD_DETOUR_FACTOR;

/** Køretid i minutter mellem to punkter — fart afhænger af turens længde. */
export const roadMinutes = (a: [number, number], b: [number, number]): number => {
  const km = roadKm(a, b);
  const speed = km < 2 ? 28 : km < 10 ? 45 : km < 30 ? 65 : 80;
  return (km / speed) * 60;
};

/** "08:30", "08:30:00" eller en ISO-tidsstempel → minutter siden midnat. */
export const parseTimeToMin = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const raw = String(value);
  if (raw.includes("T")) {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return d.getHours() * 60 + d.getMinutes();
  }
  const m = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
};

export const minutesNow = (d = new Date()): number => d.getHours() * 60 + d.getMinutes();

const coordOf = (s: FlexStop): [number, number] | null =>
  s.latitude != null && s.longitude != null ? [Number(s.latitude), Number(s.longitude)] : null;

const serviceOf = (s: FlexStop): number => Math.max(0, Number(s.duration_minutes ?? 0));

/** Seneste tilladte ankomst for et stop (kun når der er et reelt vindue). */
export const latestArrivalOf = (s: FlexStop): number | null => {
  const end = parseTimeToMin(s.time_window_end);
  if (end == null) return null;
  // Man skal kunne nå at udføre opgaven inden vinduet lukker.
  return end - serviceOf(s);
};

export const earliestArrivalOf = (s: FlexStop): number | null => parseTimeToMin(s.time_window_start);

/**
 * Simulér en rækkefølge fra en startposition og et starttidspunkt.
 * Returnerer km, minutter og ankomsttider.
 */
export const simulateOrder = (
  stops: FlexStop[],
  from: [number, number] | null,
  startMin: number,
): OrderSim => {
  let cursor = from;
  let clock = startMin;
  let km = 0;
  let drive = 0;
  let violations = 0;
  const arrivals: number[] = [];

  for (const s of stops) {
    const c = coordOf(s);
    if (c && cursor) {
      const legKm = roadKm(cursor, c);
      const legMin = roadMinutes(cursor, c);
      km += legKm;
      drive += legMin;
      clock += legMin;
    }
    const earliest = earliestArrivalOf(s);
    if (earliest != null && clock < earliest) clock = earliest; // vente-tid
    arrivals.push(clock);
    const latest = latestArrivalOf(s);
    if (latest != null && clock > latest + 0.5) violations += 1;
    clock += serviceOf(s);
    if (c) cursor = c;
  }

  return {
    totalKm: km,
    driveMin: drive,
    totalMin: clock - startMin,
    violations,
    arrivals,
  };
};

const formatSlack = (slack: number): string => {
  if (slack >= 120) return `kan rykkes ${Math.round(slack / 60)} t`;
  return `kan rykkes ${Math.round(slack)} min`;
};

/**
 * Hvor meget kan hvert stop skubbes, før nogen i kæden kommer for sent?
 * Slæk for stop i = mindste (seneste tilladte − forventet) blandt stop i
 * og alle efterfølgende stop.
 */
export const computeFlex = (
  stops: FlexStop[],
  from: [number, number] | null,
  startMin: number = minutesNow(),
): StopFlex[] => {
  const sim = simulateOrder(stops, from, startMin);
  const n = stops.length;
  const slack: (number | null)[] = new Array(n).fill(null);
  let running: number | null = null;

  for (let i = n - 1; i >= 0; i--) {
    const latest = latestArrivalOf(stops[i]);
    const own = latest == null ? null : latest - sim.arrivals[i];
    if (own != null) running = running == null ? own : Math.min(running, own);
    slack[i] = running;
  }

  return stops.map((s, i) => {
    const value = slack[i];
    const latest = latestArrivalOf(s);
    let level: FlexLevel;
    let label: string;
    if (value == null) {
      level = "flexible";
      label = "Fri tid";
    } else if (value < 0) {
      level = "late";
      label = `${Math.abs(Math.round(value))} min for sent`;
    } else if (value < 10) {
      level = "fixed";
      label = "Fast tid";
    } else if (value < 45) {
      level = "tight";
      label = formatSlack(value);
    } else {
      level = "flexible";
      label = formatSlack(value);
    }
    return {
      id: s.id,
      arrivalMin: sim.arrivals[i],
      latestMin: latest,
      slackMin: value,
      level,
      label,
    };
  });
};

export type MoveEvaluation = {
  /** Kan flytningen laves uden at bryde et tidsvindue? */
  feasible: boolean;
  /** Hvilket stop bliver for sent (hvis nogen). */
  brokenStopId: string | null;
  /** Ændring i samlet tid (minutter) — negativ = hurtigere. */
  deltaMin: number;
  /** Ændring i km — negativ = kortere. */
  deltaKm: number;
  order: FlexStop[];
};

/** Flyt ét stop fra indeks til indeks og vurdér konsekvensen. */
export const evaluateMove = (
  stops: FlexStop[],
  fromIdx: number,
  toIdx: number,
  from: [number, number] | null,
  startMin: number = minutesNow(),
): MoveEvaluation => {
  const before = simulateOrder(stops, from, startMin);
  const next = [...stops];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(Math.max(0, Math.min(next.length, toIdx)), 0, moved);
  const after = simulateOrder(next, from, startMin);

  let brokenStopId: string | null = null;
  for (let i = 0; i < next.length; i++) {
    const latest = latestArrivalOf(next[i]);
    if (latest != null && after.arrivals[i] > latest + 0.5) {
      brokenStopId = next[i].id;
      break;
    }
  }

  return {
    feasible: after.violations <= before.violations && brokenStopId === null,
    brokenStopId,
    deltaMin: after.totalMin - before.totalMin,
    deltaKm: after.totalKm - before.totalKm,
    order: next,
  };
};

/**
 * Hurtig heuristik (nærmeste nabo + 2-opt) der finder en bedre rækkefølge
 * fra den aktuelle position. Bruges kun til at vurdere OM det kan betale
 * sig at bede serveren om en rigtig optimering.
 */
export const suggestOrder = (
  stops: FlexStop[],
  from: [number, number] | null,
  startMin: number = minutesNow(),
): { order: FlexStop[]; sim: OrderSim } => {
  const withCoords = stops.filter((s) => coordOf(s));
  if (withCoords.length < 3 || !from) {
    return { order: stops, sim: simulateOrder(stops, from, startMin) };
  }

  // Nærmeste nabo efter køretid.
  const pool = [...withCoords];
  const order: FlexStop[] = [];
  let cursor = from;
  while (pool.length > 0) {
    let best = 0;
    let bestCost = Infinity;
    for (let i = 0; i < pool.length; i++) {
      const c = coordOf(pool[i])!;
      const cost = roadMinutes(cursor, c);
      if (cost < bestCost) {
        bestCost = cost;
        best = i;
      }
    }
    const [picked] = pool.splice(best, 1);
    order.push(picked);
    cursor = coordOf(picked)!;
  }

  // 2-opt på den samlede simulerede tid (inkl. tidsvindue-straf).
  const cost = (seq: FlexStop[]) => {
    const sim = simulateOrder(seq, from, startMin);
    return sim.totalMin + sim.violations * 120;
  };
  let bestSeq = order;
  let bestCost = cost(bestSeq);
  for (let pass = 0; pass < 3; pass++) {
    let improved = false;
    for (let i = 0; i < bestSeq.length - 1; i++) {
      for (let j = i + 1; j < bestSeq.length; j++) {
        const cand = [...bestSeq];
        const seg = cand.slice(i, j + 1).reverse();
        cand.splice(i, seg.length, ...seg);
        const c = cost(cand);
        if (c < bestCost - 0.01) {
          bestSeq = cand;
          bestCost = c;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }

  return { order: bestSeq, sim: simulateOrder(bestSeq, from, startMin) };
};

export type SpeedOpportunity = {
  /** Er der nok at hente til at vise "Optimér"? */
  worth: boolean;
  savedMin: number;
  savedKm: number;
  /** Rækkefølgen heuristikken foreslår (stop-id'er). */
  suggestedIds: string[];
  fixesViolations: number;
};

/**
 * Kan resten af ruten køres hurtigere i en anden rækkefølge?
 * Konservative tærskler: mindst 3 stop tilbage og mindst 6 minutter
 * (eller at en for sen aftale bliver reddet).
 */
export const findSpeedOpportunity = (
  remaining: FlexStop[],
  from: [number, number] | null,
  startMin: number = minutesNow(),
  minSavedMin = 6,
): SpeedOpportunity => {
  const none: SpeedOpportunity = {
    worth: false,
    savedMin: 0,
    savedKm: 0,
    suggestedIds: remaining.map((s) => s.id),
    fixesViolations: 0,
  };
  if (remaining.length < 3 || !from) return none;

  const current = simulateOrder(remaining, from, startMin);
  const { order, sim } = suggestOrder(remaining, from, startMin);
  const savedMin = current.totalMin - sim.totalMin;
  const savedKm = current.totalKm - sim.totalKm;
  const fixesViolations = current.violations - sim.violations;
  const sameOrder = order.map((s) => s.id).join("|") === remaining.map((s) => s.id).join("|");

  return {
    worth: !sameOrder && (savedMin >= minSavedMin || fixesViolations > 0),
    savedMin: Math.max(0, savedMin),
    savedKm: Math.max(0, savedKm),
    suggestedIds: order.map((s) => s.id),
    fixesViolations: Math.max(0, fixesViolations),
  };
};

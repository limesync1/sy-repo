/**
 * Klog vurdering: er det overhovedet umagen værd at spørge brugeren om at
 * auto-optimere rækkefølgen på en rute?
 *
 * Vi beregner to ting baseret på stops i deres NUVÆRENDE rækkefølge:
 *
 *   1. `currentKm`   = total længde langs den nuværende stop-sekvens.
 *   2. `suggestedKm` = total længde for en nearest-neighbour heuristik
 *                      startende fra første stop (den simpleste form for
 *                      "klog ny rækkefølge"). Det er ikke verdens bedste
 *                      TSP-løsning, men det er hurtigt og giver et meget
 *                      realistisk fingerpeg om hvor stort potentiale der er.
 *
 * Vi spørger KUN brugeren hvis:
 *   - der er mindst 3 stops med koordinater (med 2 er der ingen rækkefølge
 *     at optimere — bare A→B),
 *   - heuristikken sparer mindst 5 km OG mindst 20 % af den nuværende rute,
 *   - brugeren ikke har sagt "nej tak" til netop denne rute i samme session
 *     (vi pester ikke).
 *
 * Alle tærskler er bevidst konservative — vi vil hellere undlade at spørge
 * end nagge brugeren med "vil du optimere?" på en rute der allerede er
 * fint planlagt.
 */

import { haversineMeters } from "./geo-distance";

type StopLite = {
  id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  stop_order?: number | null;
};

export type OptimizeEstimate = {
  /** Er det værd at spørge brugeren? */
  worth: boolean;
  /** Hvor mange stops vi kunne arbejde med (efter coord-filter). */
  stopsWithCoords: number;
  /** Nuværende total rute-længde i km (afrundet). */
  currentKm: number;
  /** Estimeret rute-længde efter nearest-neighbour i km (afrundet). */
  suggestedKm: number;
  /** Estimeret besparelse i km (afrundet). */
  savingsKm: number;
  /** Estimeret besparelse i procent (afrundet). */
  savingsPct: number;
  /** Maskin-læsbar grund hvis worth=false — bruges i debug/telemetri. */
  reason?:
    | "too-few-stops"
    | "missing-coords"
    | "already-optimal"
    | "savings-too-small"
    | "recently-dismissed";
};

const STORAGE_KEY = "route-planner:optimize-dismissed-v1";
const DISMISS_TTL_MS = 60 * 60 * 1000; // 1 time

const safeStorage = (): Storage | null => {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const readDismissed = (): Record<string, number> => {
  const s = safeStorage();
  if (!s) return {};
  try {
    const raw = s.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeDismissed = (map: Record<string, number>) => {
  const s = safeStorage();
  if (!s) return;
  try {
    s.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota / privacy mode — drop silently */
  }
};

/** Marker at brugeren har sagt "nej tak" til at optimere netop denne rute nu. */
export const markOptimizeDismissed = (routeId: string): void => {
  if (!routeId) return;
  const map = readDismissed();
  map[routeId] = Date.now();
  // Hold størrelsen i ave — fjern dem der er udløbet.
  const cutoff = Date.now() - DISMISS_TTL_MS;
  for (const k of Object.keys(map)) if (map[k] < cutoff) delete map[k];
  writeDismissed(map);
};

const wasRecentlyDismissed = (routeId: string): boolean => {
  if (!routeId) return false;
  const map = readDismissed();
  const at = map[routeId];
  if (!at) return false;
  return Date.now() - at < DISMISS_TTL_MS;
};

const sortStops = (stops: StopLite[]): StopLite[] => {
  return [...stops].sort((a, b) => {
    const ao = a.stop_order ?? 0;
    const bo = b.stop_order ?? 0;
    return ao - bo;
  });
};

const pathLengthKm = (stops: StopLite[]): number => {
  let total = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) continue;
    total += haversineMeters(a.latitude!, a.longitude!, b.latitude!, b.longitude!) / 1000;
  }
  return total;
};

/** Nearest-neighbour heuristik fra første stop. Returnerer rute-længde i km. */
const nearestNeighbourLengthKm = (stops: StopLite[]): number => {
  if (stops.length < 2) return 0;
  const remaining = stops.slice(1);
  let current = stops[0];
  let total = 0;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const c = remaining[i];
      const d = haversineMeters(current.latitude!, current.longitude!, c.latitude!, c.longitude!);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    total += bestDist / 1000;
    current = remaining.splice(bestIdx, 1)[0];
  }
  return total;
};

/**
 * Vurder om vi skal foreslå auto-optimering for `routeId` ud fra dens
 * nuværende stops. Bruges efter en flytning eller flet for at undgå at
 * spørge "vil du optimere?" når ruten allerede er fint planlagt.
 */
export const estimateOptimizationGain = (
  routeId: string,
  stops: StopLite[],
): OptimizeEstimate => {
  const withCoords = stops.filter((s) => s.latitude != null && s.longitude != null);
  const base = {
    stopsWithCoords: withCoords.length,
    currentKm: 0,
    suggestedKm: 0,
    savingsKm: 0,
    savingsPct: 0,
  };

  if (withCoords.length < 3) {
    return { ...base, worth: false, reason: stops.length < 3 ? "too-few-stops" : "missing-coords" };
  }
  if (wasRecentlyDismissed(routeId)) {
    return { ...base, worth: false, reason: "recently-dismissed" };
  }

  const ordered = sortStops(withCoords);
  const currentKm = pathLengthKm(ordered);
  const suggestedKm = nearestNeighbourLengthKm(ordered);
  const savingsKm = Math.max(0, currentKm - suggestedKm);
  const savingsPct = currentKm > 0 ? (savingsKm / currentKm) * 100 : 0;

  const rounded = {
    currentKm: Math.round(currentKm),
    suggestedKm: Math.round(suggestedKm),
    savingsKm: Math.round(savingsKm),
    savingsPct: Math.round(savingsPct),
    stopsWithCoords: withCoords.length,
  };

  // Tærskler — bevidst konservative. Vi vil hellere undlade at spørge end
  // pester brugeren på en rute der allerede er rimeligt optimeret.
  if (rounded.currentKm < 8) {
    // Kort by-rute — selv 30 % besparelse er kun et par km værd. Drop det.
    return { ...rounded, worth: false, reason: "savings-too-small" };
  }
  if (rounded.savingsKm < 5 || rounded.savingsPct < 20) {
    return {
      ...rounded,
      worth: false,
      reason: rounded.savingsKm === 0 ? "already-optimal" : "savings-too-small",
    };
  }

  return { ...rounded, worth: true };
};
/** Husker hvornår en rute blev startet på denne enhed, så starttid og køretid
 *  overlever genindlæsning og skift mellem tjekliste og kørselsguide. */
const key = (routeId: string) => `sy.route.started.${routeId}`;

export const getRouteStartedAt = (routeId: string): number | null => {
  try {
    const raw = localStorage.getItem(key(routeId));
    const n = raw ? Number(raw) : NaN;
    // Kun samme døgn — en gammel markering må ikke give 30 timers køretid.
    return Number.isFinite(n) && Date.now() - n < 20 * 3600_000 ? n : null;
  } catch {
    return null;
  }
};

export const markRouteStarted = (routeId: string): number => {
  const existing = getRouteStartedAt(routeId);
  if (existing) return existing;
  const now = Date.now();
  try { localStorage.setItem(key(routeId), String(now)); } catch { /* privat tilstand */ }
  return now;
};

export const formatClockTime = (ms: number) =>
  new Date(ms).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });

export const formatRunDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h} t. ${m} min.` : `${m} min.`;
};

/** Arrival on this device is shared between guide and checklist; no GPS in checklist. */
const arrivalMemory = new Map<string, number>();
const arrivalKey = (routeId: string, stopId: string) => `sy.route.arrival.${routeId}.${stopId}`;
export function readArrival(routeId: string, stopId: string): number | null {
  const k = arrivalKey(routeId, stopId);
  try {
    const n = arrivalMemory.get(k) ?? Number(localStorage.getItem(k));
    return n > 0 && Number.isFinite(n) && Date.now() - n < 20 * 3600_000 ? n : null;
  } catch { return arrivalMemory.get(k) ?? null; }
}
export function saveArrival(routeId: string, stopId: string, time: number) {
  const k = arrivalKey(routeId, stopId);
  arrivalMemory.set(k, time);
  try { localStorage.setItem(k, String(time)); } catch { /* private mode */ }
}

type ArrivalEstimate = { at: number; recordedAt: number };
const estimateMemory = new Map<string, ArrivalEstimate>();
const estimateKey = (routeId: string, stopId: string) => `sy.route.eta.${routeId}.${stopId}`;
export function saveArrivalEstimate(routeId: string, stopId: string, at: number, now = Date.now()) {
  if (!Number.isFinite(at)) return;
  const value = { at, recordedAt: now };
  const k = estimateKey(routeId, stopId);
  estimateMemory.set(k, value);
  try { localStorage.setItem(k, JSON.stringify(value)); } catch { /* private mode */ }
}
export function readArrivalEstimate(routeId: string, stopId: string, now = Date.now()): number | null {
  try {
    const k = estimateKey(routeId, stopId);
    const raw = localStorage.getItem(k);
    const value: ArrivalEstimate | undefined = estimateMemory.get(k) ?? (raw ? JSON.parse(raw) : undefined);
    if (!value || !Number.isFinite(value.at) || !Number.isFinite(value.recordedAt)) return null;
    // Do not present a stale estimate or one from a future clock as live navigation.
    return now >= value.recordedAt && now - value.recordedAt <= 10 * 60_000 ? value.at : null;
  } catch { return null; }
}

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
export function readArrival(routeId: string, stopId: string): number | null {
  try { const n = Number(localStorage.getItem(`sy.route.arrival.${routeId}.${stopId}`)); return n > 0 && Number.isFinite(n) ? n : null; } catch { return null; }
}
export function saveArrival(routeId: string, stopId: string, time: number) {
  try { localStorage.setItem(`sy.route.arrival.${routeId}.${stopId}`, String(time)); } catch { /* private mode */ }
}

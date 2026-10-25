/**
 * Fælles regel for hvilke ruter man må vælge som MÅL i ruteplanlæggerens
 * vinduer (fx «Tilføj aftale til rute»). Gamle, arkiverede, slettede,
 * forventede (virtuelle) og helt udførte ruter må ikke kunne vælges.
 */
export type SelectableRouteInput = {
  route_date: string;
  archived_at?: string | null;
  deleted_at?: string | null;
  isVirtual?: boolean;
};

export type SelectableStopInput = { status?: string | null; order_status?: string | null };

/** Dagens dato (YYYY-MM-DD) i dansk tid. */
export function todayInDenmark(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Copenhagen", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

const isDone = (s: SelectableStopInput) =>
  s.status === "completed" || s.order_status === "completed" || s.status === "cancelled";

export function isSelectableTargetRoute(
  route: SelectableRouteInput,
  stops: SelectableStopInput[],
  today: string,
): boolean {
  if (route.isVirtual) return false;
  if (route.archived_at || route.deleted_at) return false;
  if (!route.route_date || route.route_date.slice(0, 10) < today) return false;
  if (stops.length > 0 && stops.every(isDone)) return false;
  return true;
}

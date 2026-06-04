/**
 * Drag-and-drop primitives for RoutePlanner.
 * -----------------------------------------------------------------------------
 * Disse helpers er rene (ingen React/state) og bruges af både @dnd-kit-
 * collision-detection og handlerne for drag-start/move/end i RoutePlanner.
 */

export type DragPoint = { x: number; y: number };

export type RouteDropPointTarget =
  | { type: "route"; routeId: string; date?: string | null }
  | { type: "day"; date: string };

/** Læs pointer-koordinater fra et MouseEvent eller TouchEvent. */
export const getDragPoint = (event: Event | null): DragPoint | null => {
  if (!event) return null;
  if ("clientX" in event && typeof (event as MouseEvent).clientX === "number") {
    const { clientX, clientY } = event as MouseEvent;
    return { x: clientX, y: clientY };
  }
  const touchEvent = event as TouchEvent;
  const touch = touchEvent.touches?.[0] ?? touchEvent.changedTouches?.[0];
  return touch ? { x: touch.clientX, y: touch.clientY } : null;
};

/** Fjern "route:"-prefix fra @dnd-kit id'er. */
export const routeIdFromDndId = (id: unknown) => String(id ?? "").replace(/^route:/, "");

/**
 * Find drop-target ved punkt: prioriterer rute-pille (hvis ikke sig selv),
 * derefter dag-celle.
 */
export const getRouteDropPointTarget = (
  point: DragPoint | null,
  sourceRouteId?: string | null,
): RouteDropPointTarget | null => {
  if (!point || typeof document === "undefined") return null;
  const elements = typeof document.elementsFromPoint === "function"
    ? document.elementsFromPoint(point.x, point.y)
    : ([document.elementFromPoint(point.x, point.y)].filter(Boolean) as Element[]);

  for (const element of elements) {
    const routeEl = element.closest<HTMLElement>("[data-route-drop-route-id]");
    const routeId = routeEl?.dataset.routeDropRouteId;
    if (routeId && routeId !== sourceRouteId) {
      return { type: "route", routeId, date: routeEl.dataset.routeDropDate ?? null };
    }
  }

  for (const element of elements) {
    const dayEl = element.closest<HTMLElement>("[data-route-drop-date]");
    const date = dayEl?.dataset.routeDropDate;
    if (date) return { type: "day", date };
  }

  return null;
};
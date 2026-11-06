type OptimizationRoute = {
  isVirtual?: boolean;
  status?: string | null;
  archived_at?: string | null;
  stops: readonly { status: string }[];
};

/** Temporary mutations disable the button, rather than removing it. */
export function hasRouteOptimization(route: OptimizationRoute, isPast = false): boolean {
  return !route.isVirtual && !isPast && !route.archived_at
    && route.status !== "completed" && route.stops.length >= 2
    && !route.stops.every((stop) => stop.status === "completed");
}
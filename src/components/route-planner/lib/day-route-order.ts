type OrderableRoute = {
  name?: string | null;
  isVirtual?: boolean;
  baseRouteId?: string;
  stops?: { subscription_id?: string | null }[];
};

/** Faste ruter = gentagende forekomster eller ruter med abonnementsstop. */
export const isFixedRoute = (r: OrderableRoute) =>
  !!r.isVirtual || !!r.baseRouteId || !!r.stops?.some((s) => !!s.subscription_id);

/** Faste ruter altid øverst på en dag, derefter navn. */
export const compareDayRoutes = (a: OrderableRoute, b: OrderableRoute) =>
  Number(isFixedRoute(b)) - Number(isFixedRoute(a)) ||
  (a.name || "").localeCompare(b.name || "", "da");

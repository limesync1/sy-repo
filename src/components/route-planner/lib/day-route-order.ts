type OrderableRoute = {
  name?: string | null;
  isVirtual?: boolean;
  baseRouteId?: string;
  base_route_id?: string | null;
  stops?: { subscription_id?: string | null; agreement_id?: string | null; agreement_interval?: string | null }[];
};

/** Fast rute = rigtig rute med gentagende aftaler eller en forekomst af en fast rute.
 *  Samme regel bruges til "Fast"-mærket og til sorteringen. */
export const isFixedRoute = (r: OrderableRoute) =>
  !r.isVirtual && (!!r.baseRouteId || !!r.base_route_id || !!r.stops?.some((s) =>
    !!(s.subscription_id || s.agreement_id || (s.agreement_interval && s.agreement_interval !== "engangskøb"))));

/** Rækkefølge på en dag: faste ruter, derefter forventede, derefter øvrige; så navn. */
const rank = (r: OrderableRoute) => (isFixedRoute(r) ? 0 : r.isVirtual ? 1 : 2);
export const compareDayRoutes = (a: OrderableRoute, b: OrderableRoute) =>
  rank(a) - rank(b) || (a.name || "").localeCompare(b.name || "", "da");

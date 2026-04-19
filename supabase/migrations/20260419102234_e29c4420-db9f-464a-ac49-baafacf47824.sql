ALTER FUNCTION public.recalc_route_totals(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.trg_recalc_route_totals() SET search_path = public, pg_temp;
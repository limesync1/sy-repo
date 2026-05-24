-- The previous partial unique indexes cannot be inferred by ON CONFLICT
-- without an explicit WHERE predicate. Replace them with a plain unique
-- index. NULL base_route_id values remain distinct by default, so legacy
-- routes without a base_route_id are unaffected.
DROP INDEX IF EXISTS public.uniq_routes_base_route_date;
DROP INDEX IF EXISTS public.routes_base_route_id_route_date_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS routes_base_route_id_route_date_key
  ON public.routes (base_route_id, route_date);

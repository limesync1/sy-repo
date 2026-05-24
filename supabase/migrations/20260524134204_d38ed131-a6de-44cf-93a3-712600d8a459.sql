-- Fix "ON CONFLICT (base_route_id, route_date)" error in materialize_virtual_route
-- by adding the unique constraint that the function expects.
-- We use a partial unique index so legacy routes without a base_route_id are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS routes_base_route_id_route_date_uidx
  ON public.routes (base_route_id, route_date)
  WHERE base_route_id IS NOT NULL;
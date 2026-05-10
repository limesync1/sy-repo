ALTER TABLE public.routes
  ADD COLUMN IF NOT EXISTS base_route_id uuid REFERENCES public.routes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_routes_base_route_id ON public.routes(base_route_id);
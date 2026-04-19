
-- Tilføj felter til route_stops for AI-ruteoptimering
ALTER TABLE public.route_stops
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS time_window_start TIME,
  ADD COLUMN IF NOT EXISTS time_window_end TIME,
  ADD COLUMN IF NOT EXISTS planned_departure TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS distance_to_next_km NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS travel_time_to_next_min INTEGER;

-- Tilføj adresse + koordinater til orders så vi kan placere på kort
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS zip_code TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);

-- Tilføj start/slut adresse på routes (medarbejderens hjem/depot)
ALTER TABLE public.routes
  ADD COLUMN IF NOT EXISTS start_address TEXT,
  ADD COLUMN IF NOT EXISTS start_latitude NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS start_longitude NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS planned_start_time TIME DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS total_duration_minutes INTEGER;

-- Tilføj felter til employees for hjem/start adresse
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS home_address TEXT,
  ADD COLUMN IF NOT EXISTS home_latitude NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS home_longitude NUMERIC(10,7);

-- Index for hurtigere lookups
CREATE INDEX IF NOT EXISTS idx_route_stops_route_seq ON public.route_stops(route_id, sequence);
CREATE INDEX IF NOT EXISTS idx_routes_business_date ON public.routes(business_id, route_date);
CREATE INDEX IF NOT EXISTS idx_orders_business_status ON public.orders(business_id, status);

-- Telemetri-tabel må aldrig fejle pga manglende referencer.
-- Fjern FK på base_route_id og route_id så vi kan logge events selv hvis
-- ruten er slettet eller endnu ikke materialiseret (fx projicerede ruter).
ALTER TABLE public.route_planner_events
  DROP CONSTRAINT IF EXISTS route_planner_events_base_route_id_fkey;

ALTER TABLE public.route_planner_events
  DROP CONSTRAINT IF EXISTS route_planner_events_route_id_fkey;
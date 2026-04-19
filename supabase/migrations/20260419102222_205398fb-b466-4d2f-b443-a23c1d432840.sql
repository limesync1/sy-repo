-- Add scheduling fields to orders so customers can request a date/time window at checkout
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS preferred_date date,
  ADD COLUMN IF NOT EXISTS preferred_time_start time without time zone,
  ADD COLUMN IF NOT EXISTS preferred_time_end time without time zone;

-- Helper: keep route totals fresh so the planner UI doesn't have to recalc
CREATE OR REPLACE FUNCTION public.recalc_route_totals(_route_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_min int;
  total_km numeric;
BEGIN
  SELECT
    COALESCE(SUM(duration_minutes), 0) + COALESCE(SUM(travel_time_to_next_min), 0),
    COALESCE(SUM(distance_to_next_km), 0)
  INTO total_min, total_km
  FROM public.route_stops
  WHERE route_id = _route_id;

  UPDATE public.routes
     SET total_distance_km = total_km,
         total_duration_minutes = total_min,
         updated_at = now()
   WHERE id = _route_id;
END;
$$;

-- Trigger: refresh totals whenever stops change
CREATE OR REPLACE FUNCTION public.trg_recalc_route_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_route_totals(OLD.route_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalc_route_totals(NEW.route_id);
    IF TG_OP = 'UPDATE' AND NEW.route_id <> OLD.route_id THEN
      PERFORM public.recalc_route_totals(OLD.route_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS recalc_route_totals_trigger ON public.route_stops;
CREATE TRIGGER recalc_route_totals_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.route_stops
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_route_totals();
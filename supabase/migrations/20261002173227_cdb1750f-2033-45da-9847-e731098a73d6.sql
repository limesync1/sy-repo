CREATE OR REPLACE FUNCTION public.cleanup_source_route_after_stop_move()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.route_id IS DISTINCT FROM OLD.route_id
     AND NOT EXISTS (
       SELECT 1 FROM public.route_stops rs WHERE rs.route_id = OLD.route_id
     ) THEN
    UPDATE public.subscriptions
       SET preferred_route_id = NEW.route_id
     WHERE preferred_route_id = OLD.route_id;

    UPDATE public.agreements
       SET preferred_route_id = NEW.route_id
     WHERE preferred_route_id = OLD.route_id;

    UPDATE public.routes
       SET archived_at = COALESCE(archived_at, now())
     WHERE id = OLD.route_id;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_source_route_after_stop_move() FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.detach_archived_route_recurrence_links()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.archived_at IS NOT NULL AND OLD.archived_at IS NULL THEN
    UPDATE public.subscriptions
       SET preferred_route_id = NULL
     WHERE preferred_route_id = NEW.id;

    UPDATE public.agreements
       SET preferred_route_id = NULL
     WHERE preferred_route_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_detach_archived_route_recurrence_links ON public.routes;
CREATE TRIGGER trg_detach_archived_route_recurrence_links
AFTER UPDATE OF archived_at ON public.routes
FOR EACH ROW
WHEN (NEW.archived_at IS NOT NULL AND OLD.archived_at IS NULL)
EXECUTE FUNCTION public.detach_archived_route_recurrence_links();

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
    DELETE FROM public.routes r
     WHERE r.id = OLD.route_id
       AND NOT EXISTS (
         SELECT 1 FROM public.route_stops rs WHERE rs.route_id = r.id
       );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_source_route_after_stop_move ON public.route_stops;
CREATE TRIGGER trg_cleanup_source_route_after_stop_move
AFTER UPDATE OF route_id ON public.route_stops
FOR EACH ROW
WHEN (NEW.route_id IS DISTINCT FROM OLD.route_id)
EXECUTE FUNCTION public.cleanup_source_route_after_stop_move();
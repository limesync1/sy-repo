CREATE OR REPLACE FUNCTION public.cleanup_empty_route_after_stop_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.routes r
  WHERE r.id = OLD.route_id
    AND NOT EXISTS (SELECT 1 FROM public.route_stops rs WHERE rs.route_id = r.id)
    AND NOT EXISTS (SELECT 1 FROM public.routes child WHERE child.base_route_id = r.id)
    AND r.created_at < now() - interval '10 minutes';
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_empty_route ON public.route_stops;
CREATE TRIGGER trg_cleanup_empty_route
AFTER DELETE ON public.route_stops
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_empty_route_after_stop_delete();
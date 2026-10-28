CREATE OR REPLACE FUNCTION public.cleanup_empty_route_after_stop_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Grace period protects routes being created right now; once a stop has
  -- existed for a couple of minutes, deleting the last one removes the route.
  DELETE FROM public.routes r
  WHERE r.id = OLD.route_id
    AND NOT EXISTS (SELECT 1 FROM public.route_stops rs WHERE rs.route_id = r.id)
    AND NOT EXISTS (SELECT 1 FROM public.routes child WHERE child.base_route_id = r.id)
    AND (r.created_at < now() - interval '10 minutes'
         OR OLD.created_at < now() - interval '2 minutes');
  RETURN OLD;
END;
$$;
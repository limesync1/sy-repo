CREATE OR REPLACE FUNCTION public.reopen_route(_route_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_count int;
BEGIN
  SELECT business_id INTO v_business_id FROM public.routes WHERE id = _route_id;
  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Route % not found', _route_id;
  END IF;

  UPDATE public.routes
     SET status = 'planned', completed_at = NULL, updated_at = now()
   WHERE id = _route_id;

  UPDATE public.route_stops
     SET status = 'planned', completed_at = NULL
   WHERE route_id = _route_id AND status = 'completed';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.route_audit_log(business_id, route_id, action, affected_count)
  VALUES (v_business_id, _route_id, 'route.reopen', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reopen_route(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_route(uuid) TO service_role;
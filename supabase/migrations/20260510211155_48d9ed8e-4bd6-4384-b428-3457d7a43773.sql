CREATE OR REPLACE FUNCTION public.log_route_planner_event(
  _business_id uuid,
  _event_type text,
  _severity text DEFAULT 'info',
  _base_route_id uuid DEFAULT NULL,
  _route_id uuid DEFAULT NULL,
  _projected_date date DEFAULT NULL,
  _client_event_id text DEFAULT NULL,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _severity NOT IN ('info', 'warning', 'error') THEN
    _severity := 'info';
  END IF;

  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_business_owner(_business_id, auth.uid())) THEN
    RAISE EXCEPTION 'Adgang nægtet';
  END IF;

  INSERT INTO public.route_planner_events (
    business_id, event_type, severity, base_route_id, route_id, projected_date, client_event_id, details
  ) VALUES (
    _business_id,
    LEFT(COALESCE(NULLIF(_event_type, ''), 'route_planner_event'), 120),
    _severity,
    _base_route_id,
    _route_id,
    _projected_date,
    _client_event_id,
    COALESCE(_details, '{}'::jsonb)
  );
END;
$$;
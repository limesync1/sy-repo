CREATE TABLE public.route_drive_traces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL,
  business_id uuid NOT NULL,
  user_id uuid NOT NULL,
  session_id uuid NOT NULL,
  points jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days')
);
CREATE INDEX route_drive_traces_route_idx ON public.route_drive_traces (route_id, session_id, created_at);

GRANT SELECT ON public.route_drive_traces TO authenticated;
GRANT ALL ON public.route_drive_traces TO service_role;

ALTER TABLE public.route_drive_traces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers view own drive traces" ON public.route_drive_traces
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND expires_at > now());

CREATE POLICY "Owners view drive traces" ON public.route_drive_traces
  FOR SELECT TO authenticated
  USING (expires_at > now() AND (public.is_business_owner(business_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role)));

-- Appends a bounded batch of GPS/shown positions. Only active employees of the route's business or its owner may record.
CREATE OR REPLACE FUNCTION public.append_drive_trace(_route_id uuid, _session_id uuid, _points jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _business uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF jsonb_typeof(_points) <> 'array' OR jsonb_array_length(_points) = 0 OR jsonb_array_length(_points) > 600 THEN
    RAISE EXCEPTION 'invalid points';
  END IF;
  SELECT r.business_id INTO _business FROM routes r WHERE r.id = _route_id AND r.deleted_at IS NULL;
  IF _business IS NULL THEN RAISE EXCEPTION 'route not found'; END IF;
  IF NOT (
    public.is_business_owner(_business, auth.uid())
    OR EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.business_id = _business AND e.is_active IS DISTINCT FROM false)
  ) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  DELETE FROM route_drive_traces WHERE expires_at <= now();
  INSERT INTO route_drive_traces (route_id, business_id, user_id, session_id, points)
  VALUES (_route_id, _business, auth.uid(), _session_id, _points);
END;
$$;

REVOKE ALL ON FUNCTION public.append_drive_trace(uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.append_drive_trace(uuid, uuid, jsonb) TO authenticated;
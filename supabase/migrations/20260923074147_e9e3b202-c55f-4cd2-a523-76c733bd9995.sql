CREATE TABLE public.employee_route_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  route_id uuid REFERENCES public.routes(id) ON DELETE CASCADE,
  route_stop_id uuid REFERENCES public.route_stops(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 500),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employee_route_notifications_target_check CHECK (route_id IS NOT NULL OR route_stop_id IS NOT NULL)
);

GRANT SELECT, INSERT, UPDATE ON public.employee_route_notifications TO authenticated;
GRANT ALL ON public.employee_route_notifications TO service_role;

ALTER TABLE public.employee_route_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage employee route notifications"
ON public.employee_route_notifications
FOR ALL TO authenticated
USING (public.is_business_owner(business_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (
  (public.is_business_owner(business_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role))
  AND sender_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_id AND e.business_id = employee_route_notifications.business_id
  )
  AND (route_id IS NULL OR EXISTS (
    SELECT 1 FROM public.routes r
    WHERE r.id = route_id AND r.business_id = employee_route_notifications.business_id
  ))
  AND (route_stop_id IS NULL OR EXISTS (
    SELECT 1 FROM public.route_stops rs
    JOIN public.routes r ON r.id = rs.route_id
    WHERE rs.id = route_stop_id AND r.business_id = employee_route_notifications.business_id
  ))
);

CREATE POLICY "Employees read own route notifications"
ON public.employee_route_notifications
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.employees e
  WHERE e.id = employee_id AND e.user_id = auth.uid() AND e.business_id = employee_route_notifications.business_id
));

CREATE POLICY "Employees mark own route notifications read"
ON public.employee_route_notifications
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.employees e
  WHERE e.id = employee_id AND e.user_id = auth.uid() AND e.business_id = employee_route_notifications.business_id
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.employees e
  WHERE e.id = employee_id AND e.user_id = auth.uid() AND e.business_id = employee_route_notifications.business_id
));

CREATE INDEX employee_route_notifications_employee_created_idx
ON public.employee_route_notifications(employee_id, created_at DESC);
CREATE INDEX employee_route_notifications_route_idx
ON public.employee_route_notifications(route_id, route_stop_id);
CREATE INDEX employee_route_notifications_unread_idx
ON public.employee_route_notifications(employee_id, read_at) WHERE read_at IS NULL;

CREATE TABLE public.route_live_positions (
  route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  heading double precision CHECK (heading IS NULL OR heading BETWEEN 0 AND 360),
  accuracy_m double precision CHECK (accuracy_m IS NULL OR accuracy_m BETWEEN 0 AND 5000),
  speed_mps double precision CHECK (speed_mps IS NULL OR speed_mps BETWEEN 0 AND 100),
  current_stop_id uuid REFERENCES public.route_stops(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '3 minutes'),
  PRIMARY KEY (route_id, employee_id)
);

GRANT SELECT ON public.route_live_positions TO authenticated;
GRANT ALL ON public.route_live_positions TO service_role;

ALTER TABLE public.route_live_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view current route positions"
ON public.route_live_positions
FOR SELECT TO authenticated
USING (public.is_business_owner(business_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Employees view own current route position"
ON public.route_live_positions
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.employees e
  WHERE e.id = employee_id AND e.user_id = auth.uid() AND e.business_id = route_live_positions.business_id
));

CREATE INDEX route_live_positions_business_fresh_idx
ON public.route_live_positions(business_id, recorded_at DESC);

CREATE OR REPLACE FUNCTION public.report_route_position(
  _route_id uuid,
  _latitude double precision,
  _longitude double precision,
  _heading double precision DEFAULT NULL,
  _accuracy_m double precision DEFAULT NULL,
  _speed_mps double precision DEFAULT NULL,
  _current_stop_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id uuid;
  v_business_id uuid;
BEGIN
  IF _latitude NOT BETWEEN -90 AND 90 OR _longitude NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'invalid_coordinates';
  END IF;

  SELECT e.id, e.business_id INTO v_employee_id, v_business_id
  FROM public.employees e
  WHERE e.user_id = auth.uid()
    AND e.is_active IS DISTINCT FROM false
    AND EXISTS (
      SELECT 1
      FROM public.routes r
      LEFT JOIN public.route_employees re ON re.route_id = r.id AND re.employee_id = e.id
      WHERE r.id = _route_id
        AND r.business_id = e.business_id
        AND r.deleted_at IS NULL
        AND (
          r.employee_id = e.id OR re.employee_id IS NOT NULL OR EXISTS (
            SELECT 1 FROM public.route_stops rs
            JOIN public.route_stop_assignees rsa ON rsa.stop_id = rs.id
            WHERE rs.route_id = r.id AND rsa.employee_id = e.id
          )
        )
    )
  LIMIT 1;

  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'route_not_assigned';
  END IF;

  IF _current_stop_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.route_stops rs WHERE rs.id = _current_stop_id AND rs.route_id = _route_id
  ) THEN
    RAISE EXCEPTION 'invalid_current_stop';
  END IF;

  INSERT INTO public.route_live_positions (
    route_id, employee_id, business_id, latitude, longitude, heading,
    accuracy_m, speed_mps, current_stop_id, recorded_at, expires_at
  ) VALUES (
    _route_id, v_employee_id, v_business_id, _latitude, _longitude,
    CASE WHEN _heading BETWEEN 0 AND 360 THEN _heading ELSE NULL END,
    CASE WHEN _accuracy_m BETWEEN 0 AND 5000 THEN _accuracy_m ELSE NULL END,
    CASE WHEN _speed_mps BETWEEN 0 AND 100 THEN _speed_mps ELSE NULL END,
    _current_stop_id, now(), now() + interval '3 minutes'
  )
  ON CONFLICT (route_id, employee_id) DO UPDATE SET
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    heading = EXCLUDED.heading,
    accuracy_m = EXCLUDED.accuracy_m,
    speed_mps = EXCLUDED.speed_mps,
    current_stop_id = EXCLUDED.current_stop_id,
    recorded_at = now(),
    expires_at = now() + interval '3 minutes';
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_route_position(_route_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.route_live_positions p
  USING public.employees e
  WHERE p.route_id = _route_id
    AND p.employee_id = e.id
    AND e.user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.report_route_position(uuid,double precision,double precision,double precision,double precision,double precision,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_route_position(uuid,double precision,double precision,double precision,double precision,double precision,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.clear_route_position(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_route_position(uuid) TO authenticated;
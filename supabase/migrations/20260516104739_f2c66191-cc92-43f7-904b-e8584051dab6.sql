CREATE OR REPLACE FUNCTION public.move_route_to_date(
  _route_id uuid,
  _new_date date,
  _scope text DEFAULT 'single'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_route public.routes%ROWTYPE;
  v_from_date date;
  v_delta_days int;
  v_base_route_id uuid;
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_is_owner boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_route FROM public.routes WHERE id = _route_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Route not found';
  END IF;

  SELECT public.has_role(v_uid, 'admin'::app_role) INTO v_is_admin;
  SELECT public.is_route_owner(_route_id, v_uid) INTO v_is_owner;
  IF NOT (COALESCE(v_is_admin, false) OR COALESCE(v_is_owner, false)) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_from_date := v_route.route_date;
  IF v_from_date = _new_date THEN
    RETURN jsonb_build_object('ok', true, 'changed', false);
  END IF;
  v_delta_days := (_new_date - v_from_date);
  v_base_route_id := COALESCE(v_route.base_route_id, v_route.id);

  -- 1) Flyt selve ruten
  UPDATE public.routes SET route_date = _new_date WHERE id = _route_id;

  -- 2) Flyt linkede aftale-forekomster med ruten
  UPDATE public.agreement_occurrences
    SET occurrence_date = _new_date
    WHERE route_id = _route_id;

  -- 3) Forskyd planlagte tider på stops med samme dag-delta
  IF v_delta_days <> 0 THEN
    UPDATE public.route_stops
      SET planned_arrival = planned_arrival + make_interval(days => v_delta_days),
          planned_departure = planned_departure + make_interval(days => v_delta_days)
      WHERE route_id = _route_id;
  END IF;

  -- 4) Marker den oprindelige dato som flyttet (undgår spøgelsesprojektion)
  INSERT INTO public.route_occurrence_exceptions
    (business_id, base_route_id, occurrence_date, replacement_route_id, exception_type)
  VALUES
    (v_route.business_id, v_base_route_id, v_from_date, _route_id, 'moved')
  ON CONFLICT (base_route_id, occurrence_date)
    DO UPDATE SET
      replacement_route_id = EXCLUDED.replacement_route_id,
      exception_type = EXCLUDED.exception_type;

  -- 5) Ved "fremover": forskyd tilbagevendende aftaler/abonnementer
  IF _scope = 'future' AND v_delta_days <> 0 THEN
    -- Abonnementer linket via stops ELLER preferred_route_id
    UPDATE public.subscriptions s
      SET next_service_date = s.next_service_date + make_interval(days => v_delta_days)
      WHERE s.status = 'active'
        AND s.interval IS NOT NULL
        AND s.interval <> 'engangskøb'
        AND s.next_service_date IS NOT NULL
        AND (
          s.preferred_route_id = _route_id
          OR s.id IN (
            SELECT subscription_id FROM public.route_stops
              WHERE route_id = _route_id AND subscription_id IS NOT NULL
          )
        );

    -- Aftaler via preferred_route_id
    UPDATE public.agreements a
      SET start_date = a.start_date + v_delta_days
      WHERE a.preferred_route_id = _route_id
        AND a.status = 'active'
        AND a.interval IS NOT NULL
        AND a.interval <> 'engangskøb'
        AND a.start_date IS NOT NULL;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'changed', true,
    'from_date', v_from_date,
    'new_date', _new_date,
    'delta_days', v_delta_days
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.move_route_to_date(uuid, date, text) TO authenticated;
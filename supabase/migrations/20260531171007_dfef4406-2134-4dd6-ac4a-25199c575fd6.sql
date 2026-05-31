CREATE OR REPLACE FUNCTION public.move_route_to_date(_route_id uuid, _new_date date, _scope text DEFAULT 'single'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_route public.routes%ROWTYPE;
  v_from_date date;
  v_delta_days int;
  v_base_route_id uuid;
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_is_owner boolean;
  v_is_series_anchor boolean := false;
  v_new public.routes%ROWTYPE;
  v_new_has_stops boolean := false;
  v_src record;
  v_new_stop_id uuid;
  v_copied int := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Du skal være logget ind for at flytte ruten' USING ERRCODE = '28000';
  END IF;

  IF _new_date IS NULL THEN
    RAISE EXCEPTION 'Den nye dato mangler';
  END IF;

  IF _scope NOT IN ('single','future') THEN
    RAISE EXCEPTION 'Ugyldigt valg for omfang (forventet "single" eller "future", fik %)', _scope;
  END IF;

  SELECT * INTO v_route FROM public.routes WHERE id = _route_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ruten findes ikke længere — den er måske slettet eller arkiveret';
  END IF;

  IF v_route.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'Ruten er arkiveret og kan ikke flyttes';
  END IF;

  IF _new_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Kan ikke flytte ruten til en dato der er passeret (%)', _new_date;
  END IF;

  SELECT public.has_role(v_uid, 'admin'::app_role) INTO v_is_admin;
  SELECT public.is_route_owner(_route_id, v_uid) INTO v_is_owner;
  IF NOT (COALESCE(v_is_admin, false) OR COALESCE(v_is_owner, false)) THEN
    RAISE EXCEPTION 'Du har ikke rettigheder til at flytte denne rute';
  END IF;

  v_from_date := v_route.route_date;
  IF v_from_date = _new_date THEN
    RETURN jsonb_build_object('ok', true, 'changed', false);
  END IF;
  v_delta_days := (_new_date - v_from_date);
  v_base_route_id := COALESCE(v_route.base_route_id, v_route.id);

  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.preferred_route_id = _route_id
      AND s.status = 'active'
      AND s.interval IS NOT NULL
      AND s.interval <> 'engangskøb'
    UNION ALL
    SELECT 1
    FROM public.agreements a
    WHERE a.preferred_route_id = _route_id
      AND a.status = 'active'
      AND a.interval IS NOT NULL
      AND a.interval <> 'engangskøb'
  ) INTO v_is_series_anchor;
  v_is_series_anchor := v_route.base_route_id IS NULL AND COALESCE(v_is_series_anchor, false);

  IF EXISTS (
    SELECT 1 FROM public.routes r
    WHERE r.id <> _route_id
      AND r.route_date = _new_date
      AND r.business_id = v_route.business_id
      AND r.archived_at IS NULL
      AND r.deleted_at IS NULL
      AND (r.id = v_base_route_id OR r.base_route_id = v_base_route_id)
  ) THEN
    IF NOT (_scope = 'single' AND v_is_series_anchor) THEN
      RAISE EXCEPTION 'Der findes allerede en rute fra samme serie på % — flet i stedet', _new_date;
    END IF;
  END IF;

  IF _scope = 'single' AND v_is_series_anchor THEN
    SELECT * INTO v_new
    FROM public.routes
    WHERE base_route_id = v_route.id
      AND route_date = _new_date
      AND archived_at IS NULL
      AND deleted_at IS NULL
    LIMIT 1;

    IF v_new.id IS NULL THEN
      INSERT INTO public.routes (
        business_id, employee_id, route_date, status, notes,
        start_address, start_latitude, start_longitude, planned_start_time,
        name, start_from_home, color, route_template_id, base_route_id
      ) VALUES (
        v_route.business_id, v_route.employee_id, _new_date, v_route.status, v_route.notes,
        v_route.start_address, v_route.start_latitude, v_route.start_longitude, v_route.planned_start_time,
        v_route.name, COALESCE(v_route.start_from_home, false), v_route.color, v_route.route_template_id, v_route.id
      )
      RETURNING * INTO v_new;
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.route_stops WHERE route_id = v_new.id)
      INTO v_new_has_stops;

    IF NOT v_new_has_stops THEN
      FOR v_src IN
        SELECT id, sequence, status, address, latitude, longitude, customer_name, customer_phone,
               service_summary, duration_minutes, time_window_start, time_window_end,
               assigned_employee_id, required_staff, notes, planned_arrival, planned_departure,
               order_id, subscription_id, agreement_occurrence_id, created_at
          FROM public.route_stops
         WHERE route_id = v_route.id
         ORDER BY sequence ASC NULLS LAST, created_at ASC
      LOOP
        INSERT INTO public.route_stops (
          route_id, sequence, status, address, latitude, longitude,
          customer_name, customer_phone, service_summary, duration_minutes,
          time_window_start, time_window_end, assigned_employee_id, required_staff, notes,
          planned_arrival, planned_departure, order_id, subscription_id, agreement_occurrence_id
        ) VALUES (
          v_new.id, COALESCE(v_src.sequence, 0), COALESCE(v_src.status, 'planned'), v_src.address, v_src.latitude, v_src.longitude,
          v_src.customer_name, v_src.customer_phone, v_src.service_summary, COALESCE(v_src.duration_minutes, 30),
          v_src.time_window_start, v_src.time_window_end, v_src.assigned_employee_id, COALESCE(v_src.required_staff, 1), v_src.notes,
          CASE WHEN v_src.planned_arrival IS NOT NULL THEN v_src.planned_arrival + make_interval(days => v_delta_days) END,
          CASE WHEN v_src.planned_departure IS NOT NULL THEN v_src.planned_departure + make_interval(days => v_delta_days) END,
          v_src.order_id, v_src.subscription_id, v_src.agreement_occurrence_id
        )
        RETURNING id INTO v_new_stop_id;

        INSERT INTO public.route_stop_assignees (stop_id, employee_id, is_lead)
        SELECT v_new_stop_id, employee_id, is_lead
          FROM public.route_stop_assignees
         WHERE stop_id = v_src.id
        ON CONFLICT DO NOTHING;

        v_copied := v_copied + 1;
      END LOOP;
    END IF;

    INSERT INTO public.route_employees (route_id, employee_id)
    SELECT v_new.id, employee_id
      FROM public.route_employees
     WHERE route_id = v_route.id
    ON CONFLICT DO NOTHING;

    INSERT INTO public.route_occurrence_exceptions
      (business_id, base_route_id, occurrence_date, replacement_route_id, exception_type)
    VALUES
      (v_route.business_id, v_route.id, v_from_date, v_new.id, 'moved')
    ON CONFLICT (base_route_id, occurrence_date)
      DO UPDATE SET
        replacement_route_id = EXCLUDED.replacement_route_id,
        exception_type = EXCLUDED.exception_type,
        shifted_to_date = NULL,
        updated_at = now();

    RETURN jsonb_build_object(
      'ok', true, 'changed', true,
      'from_date', v_from_date, 'new_date', _new_date,
      'delta_days', v_delta_days,
      'new_route_id', v_new.id,
      'materialized', true,
      'copied_stops', v_copied,
      'series_anchor_preserved', true
    );
  END IF;

  UPDATE public.routes
     SET route_date = _new_date,
         updated_at = now()
   WHERE id = _route_id;

  UPDATE public.agreement_occurrences
     SET occurrence_date = _new_date,
         updated_at = now()
   WHERE route_id = _route_id;

  IF v_delta_days <> 0 THEN
    UPDATE public.route_stops
       SET planned_arrival = planned_arrival + make_interval(days => v_delta_days),
           planned_departure = planned_departure + make_interval(days => v_delta_days)
     WHERE route_id = _route_id;
  END IF;

  INSERT INTO public.route_occurrence_exceptions
    (business_id, base_route_id, occurrence_date, replacement_route_id, exception_type)
  VALUES
    (v_route.business_id, v_base_route_id, v_from_date, _route_id, 'moved')
  ON CONFLICT (base_route_id, occurrence_date)
    DO UPDATE SET
      replacement_route_id = EXCLUDED.replacement_route_id,
      exception_type = EXCLUDED.exception_type,
      shifted_to_date = NULL,
      updated_at = now();

  IF _scope = 'future' AND v_delta_days <> 0 THEN
    UPDATE public.subscriptions s
       SET next_service_date = s.next_service_date + make_interval(days => v_delta_days),
           updated_at = now()
     WHERE s.status = 'active'
       AND s.interval IS NOT NULL
       AND s.interval <> 'engangskøb'
       AND s.next_service_date IS NOT NULL
       AND (s.preferred_route_id = _route_id OR s.preferred_route_id = v_base_route_id);
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'changed', true,
    'from_date', v_from_date, 'new_date', _new_date,
    'delta_days', v_delta_days,
    'new_route_id', _route_id,
    'materialized', false,
    'series_anchor_preserved', false
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.move_route_to_date(uuid, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.move_route_to_date(uuid, date, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.shift_projected_occurrence(
  _base_route_id uuid,
  _from_date date,
  _to_date date,
  _agreement_ids uuid[] DEFAULT ARRAY[]::uuid[],
  _subscription_ids uuid[] DEFAULT ARRAY[]::uuid[],
  _order_ids uuid[] DEFAULT ARRAY[]::uuid[],
  _move_start_dates boolean DEFAULT false,
  _move_next_dates boolean DEFAULT false,
  _skip_target_cadence boolean DEFAULT false
)
RETURNS public.route_occurrence_exceptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_base public.routes%ROWTYPE;
  v_is_admin boolean;
  v_is_owner boolean;
  v_result public.route_occurrence_exceptions%ROWTYPE;
  v_existing public.route_occurrence_exceptions%ROWTYPE;
  v_effective_from date := _from_date;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_base FROM public.routes WHERE id = _base_route_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Basisrute findes ikke';
  END IF;

  SELECT public.has_role(v_uid, 'admin'::app_role) INTO v_is_admin;
  SELECT public.is_route_owner(_base_route_id, v_uid) INTO v_is_owner;
  IF NOT (COALESCE(v_is_admin, false) OR COALESCE(v_is_owner, false)) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF _from_date IS NULL OR _to_date IS NULL THEN
    RAISE EXCEPTION 'Datoer mangler';
  END IF;

  IF _from_date = _to_date THEN
    RAISE EXCEPTION 'Den nye dato er den samme som den nuværende';
  END IF;

  IF _to_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Kan ikke flytte til en dato før i dag';
  END IF;

  SELECT * INTO v_existing
    FROM public.route_occurrence_exceptions e
   WHERE e.base_route_id = _base_route_id
     AND e.exception_type = 'shifted'
     AND e.shifted_to_date = _from_date
   LIMIT 1;

  IF FOUND THEN
    v_effective_from := v_existing.occurrence_date;
  END IF;

  IF v_effective_from = _to_date OR v_base.route_date = _to_date THEN
    IF FOUND THEN
      DELETE FROM public.route_occurrence_exceptions
       WHERE id = v_existing.id
       RETURNING * INTO v_result;
    END IF;
    RETURN v_result;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.routes r
    WHERE r.route_date = _to_date
      AND r.business_id = v_base.business_id
      AND r.archived_at IS NULL
      AND r.deleted_at IS NULL
      AND (r.id = _base_route_id OR r.base_route_id = _base_route_id)
  ) THEN
    RAISE EXCEPTION 'Der findes allerede en rute fra samme serie på %', _to_date;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.route_occurrence_exceptions e
    WHERE e.base_route_id = _base_route_id
      AND e.exception_type = 'shifted'
      AND e.shifted_to_date = _to_date
      AND e.occurrence_date <> v_effective_from
  ) THEN
    RAISE EXCEPTION 'En anden projiceret forekomst er allerede flyttet til %', _to_date;
  END IF;

  IF _skip_target_cadence THEN
    INSERT INTO public.route_occurrence_exceptions (
      business_id, base_route_id, occurrence_date, exception_type, replacement_route_id, shifted_to_date
    ) VALUES (
      v_base.business_id, _base_route_id, _to_date, 'skipped', NULL, NULL
    )
    ON CONFLICT (base_route_id, occurrence_date) DO UPDATE SET
      exception_type = CASE
        WHEN public.route_occurrence_exceptions.exception_type = 'shifted'
             AND public.route_occurrence_exceptions.shifted_to_date IS NOT NULL
          THEN public.route_occurrence_exceptions.exception_type
        ELSE 'skipped'
      END,
      updated_at = now();
  END IF;

  INSERT INTO public.route_occurrence_exceptions (
    business_id, base_route_id, occurrence_date, exception_type, shifted_to_date, replacement_route_id
  ) VALUES (
    v_base.business_id, _base_route_id, v_effective_from, 'shifted', _to_date, NULL
  )
  ON CONFLICT (base_route_id, occurrence_date) DO UPDATE SET
    exception_type = 'shifted',
    shifted_to_date = EXCLUDED.shifted_to_date,
    replacement_route_id = NULL,
    updated_at = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.shift_projected_occurrence(
  _base_route_id uuid,
  _from_date date,
  _to_date date,
  _agreement_ids uuid[] DEFAULT ARRAY[]::uuid[],
  _subscription_ids uuid[] DEFAULT ARRAY[]::uuid[],
  _order_ids uuid[] DEFAULT ARRAY[]::uuid[],
  _move_start_dates boolean DEFAULT false,
  _move_next_dates boolean DEFAULT false
)
RETURNS public.route_occurrence_exceptions
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.shift_projected_occurrence(
    _base_route_id, _from_date, _to_date,
    COALESCE(_agreement_ids, ARRAY[]::uuid[]),
    COALESCE(_subscription_ids, ARRAY[]::uuid[]),
    COALESCE(_order_ids, ARRAY[]::uuid[]),
    false, false, false
  );
$function$;

CREATE OR REPLACE FUNCTION public.shift_projected_occurrence(
  _base_route_id uuid,
  _from_date date,
  _to_date date
)
RETURNS public.route_occurrence_exceptions
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.shift_projected_occurrence(
    _base_route_id, _from_date, _to_date,
    ARRAY[]::uuid[], ARRAY[]::uuid[], ARRAY[]::uuid[],
    false, false, false
  );
$function$;

REVOKE EXECUTE ON FUNCTION public.shift_projected_occurrence(uuid, date, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.shift_projected_occurrence(uuid, date, date, uuid[], uuid[], uuid[], boolean, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.shift_projected_occurrence(uuid, date, date, uuid[], uuid[], uuid[], boolean, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shift_projected_occurrence(uuid, date, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.shift_projected_occurrence(uuid, date, date, uuid[], uuid[], uuid[], boolean, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.shift_projected_occurrence(uuid, date, date, uuid[], uuid[], uuid[], boolean, boolean, boolean) TO authenticated, service_role;
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
  v_new public.routes%ROWTYPE;
  v_new_has_stops boolean;
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

  SELECT * INTO v_route FROM public.routes WHERE id = _route_id;
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

  IF EXISTS (
    SELECT 1 FROM public.routes r
    WHERE r.id <> _route_id
      AND r.route_date = _new_date
      AND (r.id = v_base_route_id OR r.base_route_id = v_base_route_id)
  ) THEN
    IF NOT (_scope = 'single' AND v_route.base_route_id IS NULL) THEN
      RAISE EXCEPTION 'Der findes allerede en rute fra samme serie på % — flet i stedet', _new_date;
    END IF;
  END IF;

  -- ── BASE route + scope=single → clone to new date (do not move base) ──
  IF _scope = 'single' AND v_route.base_route_id IS NULL THEN
    INSERT INTO public.routes (
      business_id, route_date, name, color, start_address,
      start_latitude, start_longitude, planned_start_time, start_from_home,
      notes, base_route_id, employee_id
    ) VALUES (
      v_route.business_id, _new_date, v_route.name, v_route.color, v_route.start_address,
      v_route.start_latitude, v_route.start_longitude, v_route.planned_start_time,
      COALESCE(v_route.start_from_home, false),
      v_route.notes, v_route.id, v_route.employee_id
    )
    ON CONFLICT (base_route_id, route_date) DO NOTHING
    RETURNING * INTO v_new;

    IF v_new.id IS NULL THEN
      SELECT * INTO v_new FROM public.routes
        WHERE base_route_id = v_route.id AND route_date = _new_date
        LIMIT 1;
    END IF;

    IF v_new.id IS NULL THEN
      RAISE EXCEPTION 'Kunne ikke oprette den nye rute på % — prøv igen om et øjeblik', _new_date;
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.route_stops WHERE route_id = v_new.id)
      INTO v_new_has_stops;

    IF NOT v_new_has_stops THEN
      -- Per-row clone for guaranteed mapping between old and new stop IDs.
      -- A CTE-based RETURNING approach cannot guarantee row order, which would
      -- cause assignees to land on the wrong stops.
      FOR v_src IN
        SELECT id, sequence, address, latitude, longitude, customer_name, customer_phone,
               service_summary, duration_minutes, time_window_start, time_window_end,
               assigned_employee_id, required_staff, notes,
               planned_arrival, planned_departure,
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
          v_new.id, COALESCE(v_src.sequence, 0), 'pending', v_src.address, v_src.latitude, v_src.longitude,
          v_src.customer_name, v_src.customer_phone, v_src.service_summary, COALESCE(v_src.duration_minutes, 30),
          v_src.time_window_start, v_src.time_window_end, v_src.assigned_employee_id, COALESCE(v_src.required_staff, 1), v_src.notes,
          CASE WHEN v_src.planned_arrival IS NOT NULL THEN v_src.planned_arrival + make_interval(days => v_delta_days) END,
          CASE WHEN v_src.planned_departure IS NOT NULL THEN v_src.planned_departure + make_interval(days => v_delta_days) END,
          v_src.order_id, v_src.subscription_id, v_src.agreement_occurrence_id
        )
        RETURNING id INTO v_new_stop_id;

        INSERT INTO public.route_stop_assignees (stop_id, employee_id)
        SELECT v_new_stop_id, employee_id
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
    ON CONFLICT (base_route_id, occurrence_date) DO UPDATE SET
      replacement_route_id = EXCLUDED.replacement_route_id,
      exception_type = EXCLUDED.exception_type;

    RETURN jsonb_build_object(
      'ok', true, 'changed', true,
      'from_date', v_from_date, 'new_date', _new_date,
      'delta_days', v_delta_days, 'new_route_id', v_new.id,
      'materialized', true,
      'reused_existing', v_new_has_stops,
      'copied_stops', v_copied
    );
  END IF;

  -- ── Non-base route OR scope=future → shift the row itself (legacy) ──
  UPDATE public.routes SET route_date = _new_date WHERE id = _route_id;

  UPDATE public.agreement_occurrences
    SET occurrence_date = _new_date
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
      exception_type = EXCLUDED.exception_type;

  IF _scope = 'future' AND v_delta_days <> 0 THEN
    UPDATE public.subscriptions s
      SET next_service_date = s.next_service_date + make_interval(days => v_delta_days)
      WHERE s.status = 'active'
        AND s.interval IS NOT NULL
        AND s.interval <> 'engangskøb'
        AND s.next_service_date IS NOT NULL
        AND (s.preferred_route_id = _route_id OR s.preferred_route_id = v_base_route_id);
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'changed', true,
    'from_date', v_from_date, 'new_date', _new_date,
    'delta_days', v_delta_days
  );
END;
$function$;
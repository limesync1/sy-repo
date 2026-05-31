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
  v_existing_exception public.route_occurrence_exceptions%ROWTYPE;
  v_original_occurrence_date date;
  v_target_is_projected boolean := false;
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

  IF v_route.archived_at IS NOT NULL OR v_route.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Ruten er arkiveret eller slettet og kan ikke flyttes';
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
    RETURN jsonb_build_object('ok', true, 'changed', false, 'new_route_id', _route_id);
  END IF;
  v_delta_days := (_new_date - v_from_date);
  v_base_route_id := COALESCE(v_route.base_route_id, v_route.id);

  PERFORM pg_advisory_xact_lock(hashtext('route_series:' || v_route.business_id::text || ':' || v_base_route_id::text));

  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.status = 'active'
      AND s.interval IS NOT NULL
      AND s.interval <> 'engangskøb'
      AND (
        s.preferred_route_id = _route_id
        OR EXISTS (
          SELECT 1
          FROM public.route_stops rs
          WHERE rs.route_id = _route_id
            AND (
              (rs.subscription_id IS NOT NULL AND rs.subscription_id = s.id)
              OR (rs.order_id IS NOT NULL AND rs.order_id = s.order_id)
            )
        )
      )
    UNION ALL
    SELECT 1
    FROM public.agreements a
    WHERE a.status = 'active'
      AND a.interval IS NOT NULL
      AND a.interval <> 'engangskøb'
      AND (
        a.preferred_route_id = _route_id
        OR EXISTS (
          SELECT 1
          FROM public.agreement_occurrences ao
          LEFT JOIN public.route_stops rs ON rs.agreement_occurrence_id = ao.id
          WHERE ao.agreement_id = a.id
            AND (ao.route_id = _route_id OR rs.route_id = _route_id)
        )
        OR EXISTS (
          SELECT 1
          FROM public.subscriptions s
          JOIN public.route_stops rs
            ON (rs.subscription_id = s.id OR rs.order_id = s.order_id)
          WHERE s.id = a.legacy_subscription_id
            AND rs.route_id = _route_id
        )
      )
  ) INTO v_is_series_anchor;
  v_is_series_anchor := v_route.base_route_id IS NULL AND COALESCE(v_is_series_anchor, false);

  -- VIGTIGT: materialiserede enkelt-forekomster skal kunne flyttes tilbage
  -- til originaldatoen. Den skjulte basisrute ligger stadig fysisk på den dato,
  -- så denne undo-gren skal køre FØR serie-konfliktchecket.
  IF v_route.base_route_id IS NOT NULL THEN
    SELECT * INTO v_existing_exception
    FROM public.route_occurrence_exceptions e
    WHERE e.base_route_id = v_route.base_route_id
      AND e.replacement_route_id = _route_id
      AND e.exception_type = 'moved'
    ORDER BY e.created_at ASC, e.id ASC
    LIMIT 1;

    v_original_occurrence_date := COALESCE(v_existing_exception.occurrence_date, v_from_date);

    IF v_original_occurrence_date = _new_date THEN
      DELETE FROM public.route_occurrence_exceptions
       WHERE base_route_id = v_route.base_route_id
         AND replacement_route_id = _route_id;

      DELETE FROM public.route_stops WHERE route_id = _route_id;
      DELETE FROM public.route_employees WHERE route_id = _route_id;
      DELETE FROM public.routes WHERE id = _route_id;

      RETURN jsonb_build_object(
        'ok', true, 'changed', true,
        'from_date', v_from_date, 'new_date', _new_date,
        'undone', true,
        'new_route_id', v_route.base_route_id
      );
    END IF;
  END IF;

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

  -- Blokér at en fysisk rute flyttes ind på en dato hvor samme serie allerede
  -- har en projiceret forekomst. Ellers skjuler projektionen sig selv i UI’et,
  -- hvilket ligner at den “forsvinder”.
  IF EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.status = 'active'
      AND s.interval IS NOT NULL
      AND s.interval <> 'engangskøb'
      AND s.preferred_route_id = v_base_route_id
      AND COALESCE(s.next_service_date::date, v_route.route_date) <= _new_date
      AND (
        CASE s.interval
          WHEN 'ugentlig' THEN ((_new_date - v_route.route_date) % 7 = 0)
          WHEN 'hver_14_dag' THEN ((_new_date - v_route.route_date) % 14 = 0)
          WHEN 'månedlig' THEN EXTRACT(DAY FROM _new_date) = EXTRACT(DAY FROM v_route.route_date)
          ELSE false
        END
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.agreements a
    WHERE a.status = 'active'
      AND a.interval IS NOT NULL
      AND a.interval <> 'engangskøb'
      AND a.preferred_route_id = v_base_route_id
      AND COALESCE(a.start_date, v_route.route_date) <= _new_date
      AND (
        CASE a.interval
          WHEN 'ugentlig' THEN ((_new_date - v_route.route_date) % 7 = 0)
          WHEN 'hver_14_dag' THEN ((_new_date - v_route.route_date) % 14 = 0)
          WHEN 'månedlig' THEN EXTRACT(DAY FROM _new_date) = EXTRACT(DAY FROM v_route.route_date)
          WHEN 'custom' THEN COALESCE(a.interval_days, 0) > 0 AND ((_new_date - v_route.route_date) % a.interval_days = 0)
          ELSE false
        END
      )
  ) THEN
    -- Tillad basisrutens egen oprindelige dato og materialisering af en enkelt
    -- basisforekomst; blokér kun når brugeren prøver at lægge en anden fysisk
    -- rute oven i en eksisterende projektion.
    IF NOT (_scope = 'single' AND v_is_series_anchor) THEN
      RAISE EXCEPTION 'Datoen % er allerede optaget af en projiceret forekomst fra samme serie — flyt den projicerede forekomst eller vælg en anden dato', _new_date;
    END IF;
  END IF;

  IF v_route.base_route_id IS NOT NULL THEN
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

    DELETE FROM public.route_occurrence_exceptions
     WHERE exception_type = 'moved'
       AND replacement_route_id = _route_id
       AND NOT (base_route_id = v_route.base_route_id AND occurrence_date = v_original_occurrence_date);

    INSERT INTO public.route_occurrence_exceptions
      (business_id, base_route_id, occurrence_date, replacement_route_id, exception_type)
    VALUES
      (v_route.business_id, v_route.base_route_id, v_original_occurrence_date, _route_id, 'moved')
    ON CONFLICT (base_route_id, occurrence_date)
    DO UPDATE SET
      replacement_route_id = EXCLUDED.replacement_route_id,
      exception_type = 'moved',
      shifted_to_date = NULL,
      updated_at = now()
    RETURNING * INTO v_existing_exception;

    RETURN jsonb_build_object(
      'ok', true, 'changed', true,
      'from_date', v_from_date, 'new_date', _new_date,
      'delta_days', v_delta_days,
      'new_route_id', _route_id,
      'materialized', false,
      'series_anchor_preserved', true,
      'original_occurrence_date', v_original_occurrence_date
    );
  END IF;

  IF _scope = 'single' AND v_is_series_anchor THEN
    SELECT * INTO v_new
    FROM public.routes
    WHERE base_route_id = v_route.id
      AND route_date = _new_date
    LIMIT 1
    FOR UPDATE;

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
      ON CONFLICT (base_route_id, route_date)
      DO UPDATE SET
        archived_at = NULL,
        deleted_at = NULL,
        updated_at = now()
      RETURNING * INTO v_new;
    ELSIF v_new.archived_at IS NOT NULL OR v_new.deleted_at IS NOT NULL THEN
      UPDATE public.routes
         SET archived_at = NULL,
             deleted_at = NULL,
             updated_at = now()
       WHERE id = v_new.id
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
        v_new_stop_id := NULL;
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
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_new_stop_id;

        IF v_new_stop_id IS NULL THEN
          SELECT id INTO v_new_stop_id
          FROM public.route_stops x
          WHERE x.route_id = v_new.id
            AND (
              (v_src.order_id IS NOT NULL AND x.order_id = v_src.order_id)
              OR (v_src.subscription_id IS NOT NULL AND x.subscription_id = v_src.subscription_id)
              OR (v_src.agreement_occurrence_id IS NOT NULL AND x.agreement_occurrence_id = v_src.agreement_occurrence_id)
            )
          LIMIT 1;
        END IF;

        IF v_new_stop_id IS NOT NULL THEN
          INSERT INTO public.route_stop_assignees (stop_id, employee_id, is_lead)
          SELECT v_new_stop_id, employee_id, is_lead
            FROM public.route_stop_assignees
           WHERE stop_id = v_src.id
          ON CONFLICT DO NOTHING;
          v_copied := v_copied + 1;
        END IF;
      END LOOP;
    END IF;

    INSERT INTO public.route_employees (route_id, employee_id)
    SELECT v_new.id, employee_id
      FROM public.route_employees
     WHERE route_id = v_route.id
    ON CONFLICT DO NOTHING;

    DELETE FROM public.route_occurrence_exceptions
     WHERE exception_type = 'moved'
       AND replacement_route_id = v_new.id
       AND NOT (base_route_id = v_route.id AND occurrence_date = v_from_date);

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

  IF _scope = 'future' AND v_delta_days <> 0 THEN
    WITH linked_subscriptions AS (
      SELECT DISTINCT s.id
      FROM public.subscriptions s
      WHERE s.status = 'active'
        AND s.interval IS NOT NULL
        AND s.interval <> 'engangskøb'
        AND s.next_service_date IS NOT NULL
        AND (
          s.preferred_route_id = _route_id
          OR s.preferred_route_id = v_base_route_id
          OR EXISTS (
            SELECT 1
            FROM public.route_stops rs
            WHERE rs.route_id IN (_route_id, v_base_route_id)
              AND (
                (rs.subscription_id IS NOT NULL AND rs.subscription_id = s.id)
                OR (rs.order_id IS NOT NULL AND rs.order_id = s.order_id)
              )
          )
        )
    )
    UPDATE public.subscriptions s
       SET next_service_date = s.next_service_date + make_interval(days => v_delta_days),
           preferred_route_id = COALESCE(s.preferred_route_id, v_base_route_id),
           updated_at = now()
      FROM linked_subscriptions ls
     WHERE s.id = ls.id;

    WITH linked_agreements AS (
      SELECT DISTINCT a.id
      FROM public.agreements a
      WHERE a.status = 'active'
        AND a.interval IS NOT NULL
        AND a.interval <> 'engangskøb'
        AND (
          a.preferred_route_id = _route_id
          OR a.preferred_route_id = v_base_route_id
          OR EXISTS (
            SELECT 1
            FROM public.agreement_occurrences ao
            LEFT JOIN public.route_stops rs ON rs.agreement_occurrence_id = ao.id
            WHERE ao.agreement_id = a.id
              AND (ao.route_id IN (_route_id, v_base_route_id) OR rs.route_id IN (_route_id, v_base_route_id))
          )
          OR EXISTS (
            SELECT 1
            FROM public.subscriptions s
            JOIN public.route_stops rs
              ON (rs.subscription_id = s.id OR rs.order_id = s.order_id)
            WHERE s.id = a.legacy_subscription_id
              AND rs.route_id IN (_route_id, v_base_route_id)
          )
        )
    )
    UPDATE public.agreements a
       SET start_date = CASE WHEN a.start_date IS NOT NULL THEN a.start_date + v_delta_days ELSE a.start_date END,
           preferred_route_id = COALESCE(a.preferred_route_id, v_base_route_id),
           updated_at = now()
      FROM linked_agreements la
     WHERE a.id = la.id;
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
DROP INDEX IF EXISTS public.routes_unique_series_per_date;

CREATE UNIQUE INDEX routes_unique_series_per_date
ON public.routes (business_id, COALESCE(base_route_id, id), route_date)
WHERE archived_at IS NULL AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.materialize_virtual_route(_base_route_id uuid, _date date)
RETURNS public.routes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_base public.routes;
  v_existing public.routes;
  v_new public.routes;
  v_agreement RECORD;
  v_occ_id uuid;
  v_idx int;
  v_planned_arrival timestamptz;
  v_next_seq int;
  v_active_stop_count int := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Du er ikke logget ind. Log ind igen og prøv på ny.' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_base FROM public.routes WHERE id = _base_route_id FOR UPDATE;
  IF v_base.id IS NULL THEN
    RAISE EXCEPTION 'Basisruten findes ikke længere';
  END IF;

  IF NOT (
    public.has_role(v_uid, 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = v_base.business_id AND b.owner_id = v_uid)
  ) THEN
    RAISE EXCEPTION 'Du har ikke rettigheder til denne handling.';
  END IF;

  IF _date IS NULL THEN
    RAISE EXCEPTION 'Datoen mangler';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('route_series:' || v_base.business_id::text || ':' || _base_route_id::text));

  IF _date = v_base.route_date THEN
    RETURN v_base;
  END IF;

  SELECT * INTO v_existing
  FROM public.routes r
  WHERE r.business_id = v_base.business_id
    AND r.route_date = _date
    AND r.archived_at IS NULL
    AND r.deleted_at IS NULL
    AND COALESCE(r.base_route_id, r.id) = _base_route_id
  LIMIT 1
  FOR UPDATE;

  IF v_existing.id IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  SELECT * INTO v_existing
  FROM public.routes
  WHERE base_route_id = _base_route_id AND route_date = _date
  LIMIT 1
  FOR UPDATE;

  IF v_existing.id IS NOT NULL AND (v_existing.archived_at IS NOT NULL OR v_existing.deleted_at IS NOT NULL) THEN
    UPDATE public.routes
       SET archived_at = NULL,
           deleted_at = NULL,
           updated_at = now()
     WHERE id = v_existing.id
     RETURNING * INTO v_existing;
  END IF;

  IF v_existing.id IS NULL THEN
    INSERT INTO public.routes (
      business_id, route_date, status, name, color, start_address,
      start_latitude, start_longitude, planned_start_time, start_from_home,
      notes, base_route_id, route_template_id, employee_id
    ) VALUES (
      v_base.business_id, _date, 'planned', v_base.name, v_base.color, v_base.start_address,
      v_base.start_latitude, v_base.start_longitude, v_base.planned_start_time, COALESCE(v_base.start_from_home, false),
      v_base.notes, _base_route_id, v_base.route_template_id, v_base.employee_id
    )
    ON CONFLICT (base_route_id, route_date) DO UPDATE SET
      archived_at = NULL,
      deleted_at = NULL,
      updated_at = now()
    RETURNING * INTO v_new;

    INSERT INTO public.route_employees (route_id, employee_id)
    SELECT v_new.id, re.employee_id FROM public.route_employees re
     WHERE re.route_id = _base_route_id
    ON CONFLICT DO NOTHING;

    IF v_base.employee_id IS NOT NULL THEN
      INSERT INTO public.route_employees (route_id, employee_id)
      VALUES (v_new.id, v_base.employee_id) ON CONFLICT DO NOTHING;
    END IF;
  ELSE
    v_new := v_existing;
  END IF;

  FOR v_agreement IN
    SELECT a.* FROM public.agreements a
     WHERE a.business_id = v_base.business_id
       AND a.status = 'active' AND a.interval <> 'engangskøb'
       AND a.preferred_route_id = _base_route_id
       AND a.start_date <= _date
       AND (a.end_date IS NULL OR a.end_date >= _date)
       AND public._agreement_occurs_on_route_date(a.interval, a.interval_days, v_base.route_date, _date)
  LOOP
    SELECT COALESCE(MAX(sequence_index), -1) + 1 INTO v_idx
      FROM public.agreement_occurrences WHERE agreement_id = v_agreement.id;

    IF v_agreement.preferred_time_start IS NOT NULL THEN
      v_planned_arrival := ((_date::timestamp + v_agreement.preferred_time_start) AT TIME ZONE 'Europe/Copenhagen');
    ELSE
      v_planned_arrival := NULL;
    END IF;

    INSERT INTO public.agreement_occurrences (
      agreement_id, business_id, occurrence_date, sequence_index, status,
      route_id, employee_ids, planned_arrival
    ) VALUES (
      v_agreement.id, v_agreement.business_id, _date, v_idx, 'planned',
      v_new.id, COALESCE(v_agreement.employee_ids, '{}'::uuid[]), v_planned_arrival
    )
    ON CONFLICT (agreement_id, occurrence_date) DO UPDATE
      SET route_id = COALESCE(public.agreement_occurrences.route_id, EXCLUDED.route_id),
          planned_arrival = COALESCE(public.agreement_occurrences.planned_arrival, EXCLUDED.planned_arrival),
          employee_ids = CASE
            WHEN COALESCE(array_length(public.agreement_occurrences.employee_ids, 1), 0) = 0 THEN EXCLUDED.employee_ids
            ELSE public.agreement_occurrences.employee_ids
          END,
          updated_at = now()
    RETURNING id INTO v_occ_id;

    PERFORM public._materialize_occurrence_on_route(v_occ_id, v_new.id);
  END LOOP;

  SELECT COALESCE(MAX(sequence), -1) + 1 INTO v_next_seq
    FROM public.route_stops WHERE route_id = v_new.id;

  INSERT INTO public.route_stops (
    route_id, sequence, status, planned_arrival,
    address, latitude, longitude, customer_name, customer_phone, service_summary,
    duration_minutes, time_window_start, time_window_end, assigned_employee_id,
    required_staff, notes, order_id, subscription_id
  )
  SELECT
    v_new.id,
    v_next_seq + (row_number() OVER (ORDER BY rs.sequence, rs.created_at) - 1)::int,
    'planned',
    CASE
      WHEN rs.planned_arrival IS NOT NULL THEN ((_date::timestamp + rs.planned_arrival::time) AT TIME ZONE 'Europe/Copenhagen')
      ELSE NULL
    END,
    rs.address, rs.latitude, rs.longitude, rs.customer_name, rs.customer_phone,
    rs.service_summary, rs.duration_minutes,
    rs.time_window_start, rs.time_window_end, rs.assigned_employee_id,
    COALESCE(rs.required_staff, 1), rs.notes, rs.order_id, rs.subscription_id
  FROM public.route_stops rs
  WHERE rs.route_id = _base_route_id
    AND rs.agreement_occurrence_id IS NULL
    AND COALESCE(rs.status::text, 'planned') NOT IN ('completed', 'cancelled')
    AND NOT EXISTS (
      SELECT 1 FROM public.route_stops x
       WHERE x.route_id = v_new.id
         AND (
           (rs.order_id IS NOT NULL AND x.order_id = rs.order_id)
           OR (rs.subscription_id IS NOT NULL AND x.subscription_id = rs.subscription_id)
           OR (rs.order_id IS NULL AND rs.subscription_id IS NULL
               AND x.address IS NOT DISTINCT FROM rs.address)
         )
    )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.route_stop_assignees (stop_id, employee_id, is_lead)
  SELECT new_rs.id, rsa.employee_id, rsa.is_lead
    FROM public.route_stops new_rs
    JOIN public.route_stops base_rs
      ON base_rs.route_id = _base_route_id
     AND base_rs.address IS NOT DISTINCT FROM new_rs.address
     AND base_rs.order_id IS NOT DISTINCT FROM new_rs.order_id
     AND base_rs.subscription_id IS NOT DISTINCT FROM new_rs.subscription_id
    JOIN public.route_stop_assignees rsa ON rsa.stop_id = base_rs.id
   WHERE new_rs.route_id = v_new.id
     AND new_rs.agreement_occurrence_id IS NULL
  ON CONFLICT DO NOTHING;

  SELECT count(*)::int INTO v_active_stop_count
  FROM public.route_stops rs
  LEFT JOIN public.agreement_occurrences ao ON ao.id = rs.agreement_occurrence_id
  WHERE rs.route_id = v_new.id
    AND COALESCE(ao.status::text, rs.status::text, 'planned') NOT IN ('completed', 'cancelled');

  IF v_active_stop_count = 0 THEN
    DELETE FROM public.routes WHERE id = v_new.id;
    RAISE EXCEPTION 'Den projicerede rute har ingen aktive stops og er derfor fjernet.';
  END IF;

  DELETE FROM public.route_occurrence_exceptions
   WHERE exception_type = 'moved'
     AND replacement_route_id = v_new.id
     AND NOT (base_route_id = _base_route_id AND occurrence_date = _date);

  INSERT INTO public.route_occurrence_exceptions (
    business_id, base_route_id, occurrence_date, replacement_route_id, exception_type
  ) VALUES (
    v_base.business_id, _base_route_id, _date, v_new.id, 'moved'
  )
  ON CONFLICT (base_route_id, occurrence_date) DO UPDATE
    SET replacement_route_id = EXCLUDED.replacement_route_id,
        exception_type = EXCLUDED.exception_type,
        shifted_to_date = NULL,
        updated_at = now();

  RETURN v_new;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.materialize_virtual_route(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.materialize_virtual_route(uuid, date) TO authenticated, service_role;

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
  v_target public.routes%ROWTYPE;
  v_existing_replacement public.routes%ROWTYPE;
  v_new_has_stops boolean := false;
  v_src record;
  v_new_stop_id uuid;
  v_copied int := 0;
  v_existing_exception public.route_occurrence_exceptions%ROWTYPE;
  v_original_occurrence_date date;
  v_replacement_delta_days int;
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
          SELECT 1 FROM public.route_stops rs
          WHERE rs.route_id = _route_id
            AND ((rs.subscription_id IS NOT NULL AND rs.subscription_id = s.id) OR (rs.order_id IS NOT NULL AND rs.order_id = s.order_id))
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
          SELECT 1 FROM public.agreement_occurrences ao
          LEFT JOIN public.route_stops rs ON rs.agreement_occurrence_id = ao.id
          WHERE ao.agreement_id = a.id AND (ao.route_id = _route_id OR rs.route_id = _route_id)
        )
        OR EXISTS (
          SELECT 1 FROM public.subscriptions s
          JOIN public.route_stops rs ON (rs.subscription_id = s.id OR rs.order_id = s.order_id)
          WHERE s.id = a.legacy_subscription_id AND rs.route_id = _route_id
        )
      )
  ) INTO v_is_series_anchor;
  v_is_series_anchor := v_route.base_route_id IS NULL AND COALESCE(v_is_series_anchor, false);

  IF v_route.base_route_id IS NOT NULL THEN
    SELECT * INTO v_existing_exception
    FROM public.route_occurrence_exceptions e
    WHERE e.base_route_id = v_route.base_route_id
      AND e.replacement_route_id = _route_id
      AND e.exception_type = 'moved'
    ORDER BY e.created_at ASC, e.id ASC
    LIMIT 1
    FOR UPDATE;

    v_original_occurrence_date := COALESCE(v_existing_exception.occurrence_date, v_from_date);

    IF v_original_occurrence_date = _new_date THEN
      DELETE FROM public.route_occurrence_exceptions
       WHERE base_route_id = v_route.base_route_id
         AND replacement_route_id = _route_id;
      DELETE FROM public.route_stops WHERE route_id = _route_id;
      DELETE FROM public.route_employees WHERE route_id = _route_id;
      DELETE FROM public.routes WHERE id = _route_id;
      RETURN jsonb_build_object('ok', true, 'changed', true, 'from_date', v_from_date, 'new_date', _new_date, 'undone', true, 'new_route_id', v_route.base_route_id);
    END IF;

    SELECT * INTO v_target
    FROM public.routes r
    WHERE r.id <> _route_id
      AND r.business_id = v_route.business_id
      AND r.route_date = _new_date
      AND r.archived_at IS NULL
      AND r.deleted_at IS NULL
      AND COALESCE(r.base_route_id, r.id) = v_base_route_id
    LIMIT 1
    FOR UPDATE;

    IF v_target.id IS NOT NULL THEN
      RAISE EXCEPTION 'Datoen % har allerede en fysisk rute fra samme serie. Flyt eller flet den eksisterende rute først.', _new_date;
    END IF;

    UPDATE public.routes SET route_date = _new_date, updated_at = now() WHERE id = _route_id;
    UPDATE public.agreement_occurrences SET occurrence_date = _new_date, updated_at = now() WHERE route_id = _route_id;
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
    INSERT INTO public.route_occurrence_exceptions (business_id, base_route_id, occurrence_date, replacement_route_id, exception_type)
    VALUES (v_route.business_id, v_route.base_route_id, v_original_occurrence_date, _route_id, 'moved')
    ON CONFLICT (base_route_id, occurrence_date) DO UPDATE
      SET replacement_route_id = EXCLUDED.replacement_route_id,
          exception_type = 'moved',
          shifted_to_date = NULL,
          updated_at = now()
    RETURNING * INTO v_existing_exception;
    RETURN jsonb_build_object('ok', true, 'changed', true, 'from_date', v_from_date, 'new_date', _new_date, 'delta_days', v_delta_days, 'new_route_id', _route_id, 'materialized', false, 'series_anchor_preserved', true, 'original_occurrence_date', v_original_occurrence_date);
  END IF;

  IF _scope = 'single' AND v_is_series_anchor THEN
    SELECT * INTO v_existing_exception
    FROM public.route_occurrence_exceptions e
    WHERE e.base_route_id = v_route.id
      AND e.occurrence_date = v_from_date
      AND e.exception_type = 'moved'
      AND e.replacement_route_id IS NOT NULL
    LIMIT 1
    FOR UPDATE;

    IF v_existing_exception.replacement_route_id IS NOT NULL THEN
      SELECT * INTO v_existing_replacement
      FROM public.routes
      WHERE id = v_existing_exception.replacement_route_id
        AND archived_at IS NULL
        AND deleted_at IS NULL
      FOR UPDATE;

      IF v_existing_replacement.id IS NOT NULL THEN
        SELECT * INTO v_target
        FROM public.routes r
        WHERE r.id <> v_existing_replacement.id
          AND r.business_id = v_route.business_id
          AND r.route_date = _new_date
          AND r.archived_at IS NULL
          AND r.deleted_at IS NULL
          AND COALESCE(r.base_route_id, r.id) = v_route.id
        LIMIT 1
        FOR UPDATE;

        IF v_target.id IS NOT NULL THEN
          RAISE EXCEPTION 'Datoen % har allerede en fysisk rute fra samme serie. Flyt eller flet den eksisterende rute først.', _new_date;
        END IF;

        v_replacement_delta_days := (_new_date - v_existing_replacement.route_date);
        UPDATE public.routes SET route_date = _new_date, updated_at = now() WHERE id = v_existing_replacement.id;
        UPDATE public.agreement_occurrences SET occurrence_date = _new_date, updated_at = now() WHERE route_id = v_existing_replacement.id;
        IF v_replacement_delta_days <> 0 THEN
          UPDATE public.route_stops
             SET planned_arrival = planned_arrival + make_interval(days => v_replacement_delta_days),
                 planned_departure = planned_departure + make_interval(days => v_replacement_delta_days)
           WHERE route_id = v_existing_replacement.id;
        END IF;
        UPDATE public.route_occurrence_exceptions
           SET replacement_route_id = v_existing_replacement.id,
               exception_type = 'moved',
               shifted_to_date = NULL,
               updated_at = now()
         WHERE id = v_existing_exception.id;
        RETURN jsonb_build_object('ok', true, 'changed', true, 'from_date', v_existing_replacement.route_date, 'new_date', _new_date, 'delta_days', v_replacement_delta_days, 'new_route_id', v_existing_replacement.id, 'materialized', false, 'series_anchor_preserved', true, 'original_occurrence_date', v_from_date);
      END IF;
    END IF;

    SELECT * INTO v_new FROM public.routes WHERE base_route_id = v_route.id AND route_date = _new_date LIMIT 1 FOR UPDATE;
    IF v_new.id IS NOT NULL AND v_new.archived_at IS NULL AND v_new.deleted_at IS NULL THEN
      RAISE EXCEPTION 'Datoen % har allerede en fysisk rute fra samme serie. Flyt eller flet den eksisterende rute først.', _new_date;
    END IF;

    IF v_new.id IS NULL THEN
      INSERT INTO public.routes (business_id, employee_id, route_date, status, notes, start_address, start_latitude, start_longitude, planned_start_time, name, start_from_home, color, route_template_id, base_route_id)
      VALUES (v_route.business_id, v_route.employee_id, _new_date, v_route.status, v_route.notes, v_route.start_address, v_route.start_latitude, v_route.start_longitude, v_route.planned_start_time, v_route.name, COALESCE(v_route.start_from_home, false), v_route.color, v_route.route_template_id, v_route.id)
      ON CONFLICT (base_route_id, route_date) DO UPDATE SET archived_at = NULL, deleted_at = NULL, updated_at = now()
      RETURNING * INTO v_new;
    ELSE
      UPDATE public.routes SET archived_at = NULL, deleted_at = NULL, updated_at = now() WHERE id = v_new.id RETURNING * INTO v_new;
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.route_stops WHERE route_id = v_new.id) INTO v_new_has_stops;
    IF NOT v_new_has_stops THEN
      FOR v_src IN
        SELECT id, sequence, status, address, latitude, longitude, customer_name, customer_phone, service_summary, duration_minutes, time_window_start, time_window_end, assigned_employee_id, required_staff, notes, planned_arrival, planned_departure, order_id, subscription_id, agreement_occurrence_id, created_at
        FROM public.route_stops
        WHERE route_id = v_route.id
        ORDER BY sequence ASC NULLS LAST, created_at ASC
      LOOP
        v_new_stop_id := NULL;
        INSERT INTO public.route_stops (route_id, sequence, status, address, latitude, longitude, customer_name, customer_phone, service_summary, duration_minutes, time_window_start, time_window_end, assigned_employee_id, required_staff, notes, planned_arrival, planned_departure, order_id, subscription_id, agreement_occurrence_id)
        VALUES (v_new.id, COALESCE(v_src.sequence, 0), COALESCE(v_src.status, 'planned'), v_src.address, v_src.latitude, v_src.longitude, v_src.customer_name, v_src.customer_phone, v_src.service_summary, COALESCE(v_src.duration_minutes, 30), v_src.time_window_start, v_src.time_window_end, v_src.assigned_employee_id, COALESCE(v_src.required_staff, 1), v_src.notes, CASE WHEN v_src.planned_arrival IS NOT NULL THEN v_src.planned_arrival + make_interval(days => v_delta_days) END, CASE WHEN v_src.planned_departure IS NOT NULL THEN v_src.planned_departure + make_interval(days => v_delta_days) END, v_src.order_id, v_src.subscription_id, v_src.agreement_occurrence_id)
        ON CONFLICT DO NOTHING RETURNING id INTO v_new_stop_id;
        IF v_new_stop_id IS NULL THEN
          SELECT id INTO v_new_stop_id FROM public.route_stops x WHERE x.route_id = v_new.id AND ((v_src.order_id IS NOT NULL AND x.order_id = v_src.order_id) OR (v_src.subscription_id IS NOT NULL AND x.subscription_id = v_src.subscription_id) OR (v_src.agreement_occurrence_id IS NOT NULL AND x.agreement_occurrence_id = v_src.agreement_occurrence_id)) LIMIT 1;
        END IF;
        IF v_new_stop_id IS NOT NULL THEN
          INSERT INTO public.route_stop_assignees (stop_id, employee_id, is_lead) SELECT v_new_stop_id, employee_id, is_lead FROM public.route_stop_assignees WHERE stop_id = v_src.id ON CONFLICT DO NOTHING;
          v_copied := v_copied + 1;
        END IF;
      END LOOP;
    END IF;
    INSERT INTO public.route_employees (route_id, employee_id) SELECT v_new.id, employee_id FROM public.route_employees WHERE route_id = v_route.id ON CONFLICT DO NOTHING;
    DELETE FROM public.route_occurrence_exceptions WHERE exception_type = 'moved' AND replacement_route_id = v_new.id AND NOT (base_route_id = v_route.id AND occurrence_date = v_from_date);
    INSERT INTO public.route_occurrence_exceptions (business_id, base_route_id, occurrence_date, replacement_route_id, exception_type)
    VALUES (v_route.business_id, v_route.id, v_from_date, v_new.id, 'moved')
    ON CONFLICT (base_route_id, occurrence_date) DO UPDATE SET replacement_route_id = EXCLUDED.replacement_route_id, exception_type = EXCLUDED.exception_type, shifted_to_date = NULL, updated_at = now();
    RETURN jsonb_build_object('ok', true, 'changed', true, 'from_date', v_from_date, 'new_date', _new_date, 'delta_days', v_delta_days, 'new_route_id', v_new.id, 'materialized', true, 'copied_stops', v_copied, 'series_anchor_preserved', true);
  END IF;

  SELECT * INTO v_target
  FROM public.routes r
  WHERE r.id <> _route_id
    AND r.business_id = v_route.business_id
    AND r.route_date = _new_date
    AND r.archived_at IS NULL
    AND r.deleted_at IS NULL
    AND COALESCE(r.base_route_id, r.id) = v_base_route_id
  LIMIT 1
  FOR UPDATE;

  IF v_target.id IS NOT NULL THEN
    RAISE EXCEPTION 'Datoen % har allerede en fysisk rute fra samme serie. Flyt eller flet den eksisterende rute først.', _new_date;
  END IF;

  UPDATE public.routes SET route_date = _new_date, updated_at = now() WHERE id = _route_id;
  UPDATE public.agreement_occurrences SET occurrence_date = _new_date, updated_at = now() WHERE route_id = _route_id;
  IF v_delta_days <> 0 THEN
    UPDATE public.route_stops SET planned_arrival = planned_arrival + make_interval(days => v_delta_days), planned_departure = planned_departure + make_interval(days => v_delta_days) WHERE route_id = _route_id;
  END IF;
  IF _scope = 'future' AND v_delta_days <> 0 THEN
    WITH linked_subscriptions AS (
      SELECT DISTINCT s.id FROM public.subscriptions s
      WHERE s.status = 'active' AND s.interval IS NOT NULL AND s.interval <> 'engangskøb' AND s.next_service_date IS NOT NULL
        AND (s.preferred_route_id = _route_id OR s.preferred_route_id = v_base_route_id OR EXISTS (SELECT 1 FROM public.route_stops rs WHERE rs.route_id IN (_route_id, v_base_route_id) AND ((rs.subscription_id IS NOT NULL AND rs.subscription_id = s.id) OR (rs.order_id IS NOT NULL AND rs.order_id = s.order_id))))
    )
    UPDATE public.subscriptions s SET next_service_date = s.next_service_date + make_interval(days => v_delta_days), preferred_route_id = COALESCE(s.preferred_route_id, v_base_route_id), updated_at = now() FROM linked_subscriptions ls WHERE s.id = ls.id;
    WITH linked_agreements AS (
      SELECT DISTINCT a.id FROM public.agreements a
      WHERE a.status = 'active' AND a.interval IS NOT NULL AND a.interval <> 'engangskøb'
        AND (a.preferred_route_id = _route_id OR a.preferred_route_id = v_base_route_id OR EXISTS (SELECT 1 FROM public.agreement_occurrences ao LEFT JOIN public.route_stops rs ON rs.agreement_occurrence_id = ao.id WHERE ao.agreement_id = a.id AND (ao.route_id IN (_route_id, v_base_route_id) OR rs.route_id IN (_route_id, v_base_route_id))) OR EXISTS (SELECT 1 FROM public.subscriptions s JOIN public.route_stops rs ON (rs.subscription_id = s.id OR rs.order_id = s.order_id) WHERE s.id = a.legacy_subscription_id AND rs.route_id IN (_route_id, v_base_route_id)))
    )
    UPDATE public.agreements a SET start_date = CASE WHEN a.start_date IS NOT NULL THEN a.start_date + v_delta_days ELSE a.start_date END, preferred_route_id = COALESCE(a.preferred_route_id, v_base_route_id), updated_at = now() FROM linked_agreements la WHERE a.id = la.id;
  END IF;
  RETURN jsonb_build_object('ok', true, 'changed', true, 'from_date', v_from_date, 'new_date', _new_date, 'delta_days', v_delta_days, 'new_route_id', _route_id, 'materialized', false, 'series_anchor_preserved', false);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.move_route_to_date(uuid, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.move_route_to_date(uuid, date, text) TO authenticated, service_role;
-- =====================================================================
-- Fix one-ready-ahead materialization for legacy subscriptions too
-- =====================================================================

CREATE OR REPLACE FUNCTION public._recurrence_interval_duration(
  _interval text,
  _custom_days integer DEFAULT NULL
)
RETURNS interval
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v interval;
BEGIN
  IF _custom_days IS NOT NULL AND _custom_days > 0 THEN
    RETURN make_interval(days => _custom_days);
  END IF;

  v := public.interval_to_duration(_interval);
  IF v IS NOT NULL THEN
    RETURN v;
  END IF;

  CASE lower(trim(coalesce(_interval, '')))
    WHEN 'every_1_day' THEN RETURN interval '1 day';
    WHEN 'every_2_day' THEN RETURN interval '2 days';
    WHEN 'every_1_week' THEN RETURN interval '1 week';
    WHEN 'every_2_week' THEN RETURN interval '2 weeks';
    WHEN 'every_3_week' THEN RETURN interval '3 weeks';
    WHEN 'every_4_week' THEN RETURN interval '4 weeks';
    WHEN 'every_8_week' THEN RETURN interval '8 weeks';
    WHEN 'every_1_month' THEN RETURN interval '1 month';
    WHEN 'every_3_month' THEN RETURN interval '3 months';
    WHEN 'every_6_month' THEN RETURN interval '6 months';
    WHEN 'every_1_year' THEN RETURN interval '1 year';
    ELSE RETURN NULL;
  END CASE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._recurrence_interval_duration(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._recurrence_interval_duration(text, integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public._recurs_on_route_date(
  _interval text,
  _custom_days integer,
  _anchor_date date,
  _target_date date
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_duration interval;
  v_cursor date;
  v_next date;
  v_guard int := 0;
BEGIN
  IF _anchor_date IS NULL OR _target_date IS NULL OR _target_date < _anchor_date THEN
    RETURN false;
  END IF;

  v_duration := public._recurrence_interval_duration(_interval, _custom_days);
  IF v_duration IS NULL THEN
    RETURN _target_date = _anchor_date;
  END IF;

  v_cursor := _anchor_date;
  WHILE v_cursor < _target_date AND v_guard < 4000 LOOP
    v_next := (v_cursor::timestamp + v_duration)::date;
    IF v_next <= v_cursor THEN
      v_next := v_cursor + 1;
    END IF;
    v_cursor := v_next;
    v_guard := v_guard + 1;
  END LOOP;

  RETURN v_cursor = _target_date;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._recurs_on_route_date(text, integer, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._recurs_on_route_date(text, integer, date, date) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public._next_occurrence_date_for_base_route(
  _base_route_id uuid,
  _after date
)
RETURNS date
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_base public.routes%ROWTYPE;
  v_day date;
  v_guard int := 0;
BEGIN
  SELECT * INTO v_base FROM public.routes WHERE id = _base_route_id;
  IF NOT FOUND OR v_base.archived_at IS NOT NULL OR v_base.deleted_at IS NOT NULL THEN
    RETURN NULL;
  END IF;

  v_day := GREATEST(_after, v_base.route_date);
  WHILE v_guard < 366 LOOP
    IF EXISTS (
      SELECT 1
      FROM public.agreements a
      WHERE a.preferred_route_id = _base_route_id
        AND a.status = 'active'
        AND a.interval <> 'engangskøb'
        AND a.start_date <= v_day
        AND (a.end_date IS NULL OR a.end_date >= v_day)
        AND public._agreement_occurs_on_route_date(a.interval, a.interval_days, v_base.route_date, v_day)
        AND NOT EXISTS (
          SELECT 1 FROM public.route_occurrence_exceptions ex
          WHERE ex.base_route_id = _base_route_id
            AND ex.occurrence_date = v_day
            AND COALESCE(ex.exception_type, 'moved') IN ('skipped','shifted')
        )
    ) OR EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.preferred_route_id = _base_route_id
        AND s.status = 'active'
        AND COALESCE(s.details->>'interval', s.interval) IS NOT NULL
        AND COALESCE(s.details->>'interval', s.interval) <> 'engangskøb'
        AND COALESCE(s.next_service_date::date, s.created_at::date, v_base.route_date) <= v_day
        AND public._recurs_on_route_date(
          COALESCE(s.details->>'interval', s.interval),
          NULL,
          v_base.route_date,
          v_day
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.route_occurrence_exceptions ex
          WHERE ex.base_route_id = _base_route_id
            AND ex.occurrence_date = v_day
            AND COALESCE(ex.exception_type, 'moved') IN ('skipped','shifted')
        )
    ) THEN
      RETURN v_day;
    END IF;
    v_day := v_day + 1;
    v_guard := v_guard + 1;
  END LOOP;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._next_occurrence_date_for_base_route(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._next_occurrence_date_for_base_route(uuid, date) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public._materialize_subscription_stop_on_route(
  _subscription_id uuid,
  _route_id uuid,
  _occurrence_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_sub public.subscriptions%ROWTYPE;
  v_source_order public.orders%ROWTYPE;
  v_source_stop public.route_stops%ROWTYPE;
  v_completed_snapshot public.employee_completed_stops%ROWTYPE;
  v_sequence int;
  v_planned timestamptz;
  v_employee_id uuid;
  v_service_summary text;
BEGIN
  SELECT * INTO v_sub FROM public.subscriptions WHERE id = _subscription_id;
  IF NOT FOUND OR v_sub.status <> 'active' OR _route_id IS NULL OR _occurrence_date IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_source_order FROM public.orders WHERE id = v_sub.order_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.route_stops rs
    WHERE rs.route_id = _route_id
      AND rs.subscription_id = _subscription_id
      AND COALESCE(rs.status, 'pending') NOT IN ('completed', 'cancelled')
  ) THEN
    RETURN;
  END IF;

  SELECT * INTO v_source_stop
  FROM public.route_stops rs
  WHERE rs.order_id = v_sub.order_id
  ORDER BY rs.completed_at DESC NULLS LAST, rs.created_at DESC
  LIMIT 1;

  SELECT * INTO v_completed_snapshot
  FROM public.employee_completed_stops ecs
  WHERE ecs.order_id = v_sub.order_id
     OR (ecs.business_id = v_sub.business_id
         AND ecs.customer_name = COALESCE(v_sub.customer_name, v_source_order.customer_name)
         AND ecs.service_summary = v_sub.service_name)
  ORDER BY ecs.completed_at DESC NULLS LAST, ecs.created_at DESC
  LIMIT 1;

  v_employee_id := COALESCE(v_source_stop.assigned_employee_id, v_completed_snapshot.employee_id);
  v_service_summary := COALESCE(v_source_stop.service_summary, v_completed_snapshot.service_summary, v_sub.service_name);

  v_planned := CASE
    WHEN v_source_order.preferred_time_start IS NOT NULL
      THEN ((_occurrence_date::timestamp + v_source_order.preferred_time_start) AT TIME ZONE 'Europe/Copenhagen')
    WHEN v_sub.next_service_date IS NOT NULL
      THEN ((_occurrence_date::timestamp + (v_sub.next_service_date AT TIME ZONE 'Europe/Copenhagen')::time) AT TIME ZONE 'Europe/Copenhagen')
    ELSE NULL
  END;

  SELECT COALESCE(MAX(sequence), 0) + 1 INTO v_sequence
  FROM public.route_stops
  WHERE route_id = _route_id;

  INSERT INTO public.route_stops (
    route_id, order_id, subscription_id, agreement_occurrence_id, sequence, planned_arrival, status,
    address, latitude, longitude, customer_name, customer_phone, service_summary,
    duration_minutes, time_window_start, time_window_end, assigned_employee_id, required_staff
  ) VALUES (
    _route_id, v_sub.order_id, v_sub.id, NULL, v_sequence, v_planned, 'pending',
    COALESCE(v_source_stop.address, v_completed_snapshot.address, v_source_order.address),
    v_source_order.latitude, v_source_order.longitude,
    COALESCE(v_sub.customer_name, v_source_order.customer_name),
    v_source_order.customer_phone,
    v_service_summary,
    COALESCE(v_source_stop.duration_minutes, v_completed_snapshot.duration_minutes, v_source_order.estimated_duration_minutes),
    v_source_order.preferred_time_start, v_source_order.preferred_time_end,
    v_employee_id,
    COALESCE(v_source_stop.required_staff, 1)
  ) ON CONFLICT DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._materialize_subscription_stop_on_route(uuid, uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._materialize_subscription_stop_on_route(uuid, uuid, date) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.materialize_virtual_route(_base_route_id uuid, _date date)
RETURNS public.routes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_base public.routes;
  v_existing public.routes;
  v_new public.routes;
  v_agreement RECORD;
  v_subscription RECORD;
  v_occ_id uuid;
  v_idx int;
  v_planned_arrival timestamptz;
  v_next_seq int;
  v_active_stop_count int := 0;
BEGIN
  SELECT * INTO v_base FROM public.routes WHERE id = _base_route_id FOR UPDATE;
  IF v_base.id IS NULL THEN
    RAISE EXCEPTION 'Basisruten findes ikke længere';
  END IF;

  IF v_uid IS NOT NULL AND NOT (
    public.has_role(v_uid, 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = v_base.business_id AND b.owner_id = v_uid)
    OR public.is_route_assigned_employee(v_base.id, v_uid)
    OR EXISTS (
      SELECT 1
      FROM public.agreements a
      JOIN public.employees e ON e.business_id = a.business_id
      WHERE a.preferred_route_id = v_base.id
        AND e.user_id = v_uid
        AND e.id = ANY(COALESCE(a.employee_ids, '{}'::uuid[]))
    )
    OR EXISTS (
      SELECT 1
      FROM public.subscriptions s
      JOIN public.employees e ON e.business_id = s.business_id
      WHERE s.preferred_route_id = v_base.id
        AND e.user_id = v_uid
        AND (public.is_route_assigned_employee(v_base.id, v_uid) OR v_base.employee_id = e.id)
    )
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
    IF v_base.allow_early_completion IS TRUE AND v_existing.allow_early_completion IS DISTINCT FROM TRUE THEN
      UPDATE public.routes
         SET allow_early_completion = TRUE,
             updated_at = now()
       WHERE id = v_existing.id
       RETURNING * INTO v_existing;
    END IF;
    v_new := v_existing;
  ELSE
    SELECT * INTO v_existing
    FROM public.routes
    WHERE base_route_id = _base_route_id AND route_date = _date
    LIMIT 1
    FOR UPDATE;

    IF v_existing.id IS NOT NULL AND (v_existing.archived_at IS NOT NULL OR v_existing.deleted_at IS NOT NULL) THEN
      UPDATE public.routes
         SET archived_at = NULL,
             deleted_at = NULL,
             allow_early_completion = CASE WHEN v_base.allow_early_completion IS TRUE THEN TRUE ELSE allow_early_completion END,
             updated_at = now()
       WHERE id = v_existing.id
       RETURNING * INTO v_existing;
    END IF;

    IF v_existing.id IS NULL THEN
      INSERT INTO public.routes (
        business_id, route_date, status, name, color, start_address,
        start_latitude, start_longitude, planned_start_time, start_from_home,
        notes, base_route_id, route_template_id, employee_id, allow_early_completion
      ) VALUES (
        v_base.business_id, _date, 'planned', v_base.name, v_base.color, v_base.start_address,
        v_base.start_latitude, v_base.start_longitude, v_base.planned_start_time, COALESCE(v_base.start_from_home, false),
        v_base.notes, _base_route_id, v_base.route_template_id, v_base.employee_id, COALESCE(v_base.allow_early_completion, false)
      )
      ON CONFLICT (base_route_id, route_date) DO UPDATE SET
        archived_at = NULL,
        deleted_at = NULL,
        allow_early_completion = CASE WHEN EXCLUDED.allow_early_completion IS TRUE THEN TRUE ELSE public.routes.allow_early_completion END,
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
      IF v_base.allow_early_completion IS TRUE AND v_existing.allow_early_completion IS DISTINCT FROM TRUE THEN
        UPDATE public.routes
           SET allow_early_completion = TRUE,
               updated_at = now()
         WHERE id = v_existing.id
         RETURNING * INTO v_existing;
      END IF;
      v_new := v_existing;
    END IF;
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

  FOR v_subscription IN
    SELECT s.*
    FROM public.subscriptions s
    WHERE s.business_id = v_base.business_id
      AND s.status = 'active'
      AND s.preferred_route_id = _base_route_id
      AND COALESCE(s.details->>'interval', s.interval) IS NOT NULL
      AND COALESCE(s.details->>'interval', s.interval) <> 'engangskøb'
      AND COALESCE(s.next_service_date::date, s.created_at::date, v_base.route_date) <= _date
      AND public._recurs_on_route_date(COALESCE(s.details->>'interval', s.interval), NULL, v_base.route_date, _date)
  LOOP
    PERFORM public._materialize_subscription_stop_on_route(v_subscription.id, v_new.id, _date);
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
    AND rs.subscription_id IS NULL
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
$$;

REVOKE EXECUTE ON FUNCTION public.materialize_virtual_route(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.materialize_virtual_route(uuid, date) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.materialize_my_day_routes_for_employee(_date date)
RETURNS TABLE(route_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_emp public.employees;
  v_base_id uuid;
  v_route public.routes;
  v_latest public.routes%ROWTYPE;
  v_after date;
  v_next_ready date;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_emp
  FROM public.employees
  WHERE user_id = v_uid
  LIMIT 1;

  IF v_emp.id IS NULL OR _date IS NULL THEN
    RETURN;
  END IF;

  FOR v_base_id IN
    SELECT DISTINCT r.id
    FROM public.routes r
    WHERE r.business_id = v_emp.business_id
      AND r.archived_at IS NULL
      AND r.deleted_at IS NULL
      AND r.base_route_id IS NULL
      AND (
        EXISTS (
          SELECT 1
          FROM public.agreements a
          WHERE a.preferred_route_id = r.id
            AND a.status = 'active'
            AND a.interval <> 'engangskøb'
            AND a.start_date <= _date
            AND (a.end_date IS NULL OR a.end_date >= _date)
            AND public._agreement_occurs_on_route_date(a.interval, a.interval_days, r.route_date, _date)
            AND (
              public.is_route_assigned_employee(r.id, v_uid)
              OR r.employee_id = v_emp.id
              OR v_emp.id = ANY(COALESCE(a.employee_ids, '{}'::uuid[]))
            )
        )
        OR EXISTS (
          SELECT 1
          FROM public.subscriptions s
          WHERE s.preferred_route_id = r.id
            AND s.status = 'active'
            AND COALESCE(s.details->>'interval', s.interval) IS NOT NULL
            AND COALESCE(s.details->>'interval', s.interval) <> 'engangskøb'
            AND COALESCE(s.next_service_date::date, s.created_at::date, r.route_date) <= _date
            AND public._recurs_on_route_date(COALESCE(s.details->>'interval', s.interval), NULL, r.route_date, _date)
            AND (
              public.is_route_assigned_employee(r.id, v_uid)
              OR r.employee_id = v_emp.id
            )
        )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.route_occurrence_exceptions ex
        WHERE ex.base_route_id = r.id
          AND ex.occurrence_date = _date
          AND COALESCE(ex.exception_type, 'moved') IN ('skipped', 'shifted')
      )
  LOOP
    BEGIN
      SELECT * INTO v_route FROM public.routes
      WHERE base_route_id = v_base_id AND route_date = _date
        AND archived_at IS NULL AND deleted_at IS NULL
      LIMIT 1;

      IF v_route.id IS NOT NULL THEN
        route_id := v_route.id;
        RETURN NEXT;
        CONTINUE;
      END IF;

      SELECT * INTO v_latest
      FROM public.routes
      WHERE base_route_id = v_base_id
        AND archived_at IS NULL AND deleted_at IS NULL
      ORDER BY route_date DESC LIMIT 1;

      IF FOUND AND NOT public._route_is_fully_done(v_latest.id) THEN
        CONTINUE;
      END IF;

      IF FOUND THEN
        v_after := v_latest.route_date + 1;
      ELSE
        v_after := CURRENT_DATE;
      END IF;

      v_next_ready := public._next_occurrence_date_for_base_route(v_base_id, v_after);
      IF v_next_ready IS NULL OR v_next_ready <> _date THEN
        CONTINUE;
      END IF;

      SELECT * INTO v_route FROM public.materialize_virtual_route(v_base_id, _date);
      IF v_route.id IS NOT NULL THEN
        route_id := v_route.id;
        RETURN NEXT;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;
  END LOOP;

  RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.materialize_my_day_routes_for_employee(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.materialize_my_day_routes_for_employee(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.materialize_my_day_routes_for_employee(date) TO service_role;

CREATE OR REPLACE FUNCTION public.materialize_next_for_all_base_routes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_id uuid;
  v_n int := 0;
  v_res uuid;
BEGIN
  FOR v_id IN
    SELECT DISTINCT r.id
    FROM public.routes r
    WHERE r.base_route_id IS NULL
      AND r.archived_at IS NULL
      AND r.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.agreements a
          WHERE a.preferred_route_id = r.id
            AND a.status = 'active'
            AND a.interval <> 'engangskøb'
        )
        OR EXISTS (
          SELECT 1 FROM public.subscriptions s
          WHERE s.preferred_route_id = r.id
            AND s.status = 'active'
            AND COALESCE(s.details->>'interval', s.interval) IS NOT NULL
            AND COALESCE(s.details->>'interval', s.interval) <> 'engangskøb'
        )
      )
  LOOP
    BEGIN
      v_res := public.materialize_next_occurrence_for_base_route(v_id);
      IF v_res IS NOT NULL THEN v_n := v_n + 1; END IF;
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;
  END LOOP;
  RETURN v_n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.materialize_next_for_all_base_routes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.materialize_next_for_all_base_routes() TO service_role;
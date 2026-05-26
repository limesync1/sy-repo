-- Prevent duplicate template routes from concurrent occurrence materialization.
CREATE UNIQUE INDEX IF NOT EXISTS routes_unique_template_per_date
  ON public.routes (business_id, route_date, route_template_id)
  WHERE route_template_id IS NOT NULL
    AND archived_at IS NULL
    AND deleted_at IS NULL;

-- Safe, idempotent route stop creation for all frontend "add to route" flows.
CREATE OR REPLACE FUNCTION public.add_route_stop_idempotent(_payload jsonb)
RETURNS public.route_stops
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_route_id uuid := NULLIF(_payload->>'route_id','')::uuid;
  v_order_id uuid := NULLIF(_payload->>'order_id','')::uuid;
  v_subscription_id uuid := NULLIF(_payload->>'subscription_id','')::uuid;
  v_occurrence_id uuid := NULLIF(_payload->>'agreement_occurrence_id','')::uuid;
  v_existing public.route_stops%ROWTYPE;
  v_new public.route_stops%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Du skal være logget ind for at ændre ruter' USING ERRCODE = '28000';
  END IF;

  IF v_route_id IS NULL THEN
    RAISE EXCEPTION 'Rute mangler';
  END IF;

  IF NOT (public.has_role(v_uid, 'admin'::public.app_role) OR public.is_route_owner(v_route_id, v_uid)) THEN
    RAISE EXCEPTION 'Du har ikke rettigheder til denne rute';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('route_stops_route:' || v_route_id::text));

  IF v_order_id IS NOT NULL OR v_subscription_id IS NOT NULL OR v_occurrence_id IS NOT NULL THEN
    SELECT * INTO v_existing
      FROM public.route_stops rs
     WHERE rs.route_id = v_route_id
       AND (
         (v_order_id IS NOT NULL AND rs.order_id = v_order_id)
         OR (v_subscription_id IS NOT NULL AND rs.subscription_id = v_subscription_id)
         OR (v_occurrence_id IS NOT NULL AND rs.agreement_occurrence_id = v_occurrence_id)
       )
     ORDER BY rs.created_at ASC
     LIMIT 1;

    IF v_existing.id IS NOT NULL THEN
      RETURN v_existing;
    END IF;
  END IF;

  INSERT INTO public.route_stops (
    route_id, order_id, subscription_id, agreement_occurrence_id, sequence, status,
    customer_name, customer_phone, address, latitude, longitude, service_summary,
    duration_minutes, time_window_start, time_window_end, assigned_employee_id, required_staff,
    planned_arrival, notes
  ) VALUES (
    v_route_id,
    v_order_id,
    v_subscription_id,
    v_occurrence_id,
    COALESCE(NULLIF(_payload->>'sequence','')::int, 0),
    COALESCE(NULLIF(_payload->>'status',''), 'pending'),
    NULLIF(_payload->>'customer_name',''),
    NULLIF(_payload->>'customer_phone',''),
    NULLIF(_payload->>'address',''),
    NULLIF(_payload->>'latitude','')::numeric,
    NULLIF(_payload->>'longitude','')::numeric,
    NULLIF(_payload->>'service_summary',''),
    COALESCE(NULLIF(_payload->>'duration_minutes','')::int, 30),
    NULLIF(_payload->>'time_window_start','')::time,
    NULLIF(_payload->>'time_window_end','')::time,
    NULLIF(_payload->>'assigned_employee_id','')::uuid,
    COALESCE(NULLIF(_payload->>'required_staff','')::smallint, 1),
    NULLIF(_payload->>'planned_arrival','')::timestamptz,
    NULLIF(_payload->>'notes','')
  )
  ON CONFLICT DO NOTHING
  RETURNING * INTO v_new;

  IF v_new.id IS NOT NULL THEN
    RETURN v_new;
  END IF;

  IF v_order_id IS NOT NULL OR v_subscription_id IS NOT NULL OR v_occurrence_id IS NOT NULL THEN
    SELECT * INTO v_existing
      FROM public.route_stops rs
     WHERE rs.route_id = v_route_id
       AND (
         (v_order_id IS NOT NULL AND rs.order_id = v_order_id)
         OR (v_subscription_id IS NOT NULL AND rs.subscription_id = v_subscription_id)
         OR (v_occurrence_id IS NOT NULL AND rs.agreement_occurrence_id = v_occurrence_id)
       )
     ORDER BY rs.created_at ASC
     LIMIT 1;

    IF v_existing.id IS NOT NULL THEN
      RETURN v_existing;
    END IF;
  END IF;

  RAISE EXCEPTION 'Rutestoppet kunne ikke oprettes';
END;
$function$;

-- Serialize route-to-route moves so conflict checks and updates cannot race.
CREATE OR REPLACE FUNCTION public.move_stops_to_route(_stop_ids uuid[], _target_route_id uuid)
RETURNS TABLE(moved_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_target_business uuid;
  v_seq int;
  v_moved int := 0;
BEGIN
  SELECT business_id INTO v_target_business
    FROM public.routes WHERE id = _target_route_id;

  IF v_target_business IS NULL THEN
    RAISE EXCEPTION 'Målrute findes ikke';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('route_stops_route:' || _target_route_id::text));

  SELECT COALESCE(MAX(sequence), -1) INTO v_seq
    FROM public.route_stops WHERE route_id = _target_route_id;

  WITH src AS (
    SELECT rs.id, rs.order_id, rs.subscription_id, rs.agreement_occurrence_id
      FROM public.route_stops rs
      JOIN public.routes r ON r.id = rs.route_id
     WHERE rs.id = ANY(_stop_ids)
       AND r.business_id = v_target_business
       AND rs.route_id <> _target_route_id
  ),
  conflicting AS (
    SELECT s.id
      FROM src s
     WHERE EXISTS (
       SELECT 1 FROM public.route_stops t
        WHERE t.route_id = _target_route_id
          AND (
            (s.order_id IS NOT NULL AND t.order_id = s.order_id)
            OR (s.subscription_id IS NOT NULL AND t.subscription_id = s.subscription_id)
            OR (s.agreement_occurrence_id IS NOT NULL AND t.agreement_occurrence_id = s.agreement_occurrence_id)
          )
     )
  )
  DELETE FROM public.route_stops WHERE id IN (SELECT id FROM conflicting);

  WITH eligible AS (
    SELECT rs.id,
           ROW_NUMBER() OVER (ORDER BY rs.sequence NULLS LAST, rs.created_at) AS rn
      FROM public.route_stops rs
      JOIN public.routes r ON r.id = rs.route_id
     WHERE rs.id = ANY(_stop_ids)
       AND r.business_id = v_target_business
       AND rs.route_id <> _target_route_id
       AND NOT EXISTS (
         SELECT 1 FROM public.route_stops t
          WHERE t.route_id = _target_route_id
            AND t.id <> rs.id
            AND (
              (rs.order_id IS NOT NULL AND t.order_id = rs.order_id)
              OR (rs.subscription_id IS NOT NULL AND t.subscription_id = rs.subscription_id)
              OR (rs.agreement_occurrence_id IS NOT NULL AND t.agreement_occurrence_id = rs.agreement_occurrence_id)
            )
       )
  )
  UPDATE public.route_stops rs
     SET route_id = _target_route_id,
         sequence = v_seq + e.rn,
         planned_arrival = NULL
    FROM eligible e
   WHERE rs.id = e.id;

  GET DIAGNOSTICS v_moved = ROW_COUNT;
  RETURN QUERY SELECT v_moved;
END;
$function$;

-- Serialize date moves after the split/target route is resolved.
CREATE OR REPLACE FUNCTION public.move_stops_to_date(_stop_ids uuid[], _target_date date)
RETURNS TABLE(moved_count integer, missing_employee_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  s RECORD;
  v_employee uuid;
  v_target_route uuid;
  v_seq int;
  v_moved int := 0;
  v_missing int := 0;
  v_conflict boolean;
BEGIN
  FOR s IN
    SELECT rs.id, rs.route_id, rs.assigned_employee_id,
           rs.order_id, rs.subscription_id, rs.agreement_occurrence_id,
           r.business_id, r.route_date AS source_date,
           r.employee_id AS source_route_employee
      FROM public.route_stops rs
      JOIN public.routes r ON r.id = rs.route_id
     WHERE rs.id = ANY(_stop_ids)
     ORDER BY rs.sequence NULLS LAST, rs.created_at ASC
  LOOP
    IF s.source_date = _target_date THEN
      CONTINUE;
    END IF;

    v_employee := s.assigned_employee_id;
    IF v_employee IS NULL THEN
      SELECT employee_id INTO v_employee FROM public.route_stop_assignees
       WHERE stop_id = s.id ORDER BY is_lead DESC NULLS LAST, created_at ASC LIMIT 1;
    END IF;
    IF v_employee IS NULL THEN v_employee := s.source_route_employee; END IF;
    IF v_employee IS NULL THEN
      SELECT employee_id INTO v_employee FROM public.route_employees
       WHERE route_id = s.route_id ORDER BY created_at ASC LIMIT 1;
    END IF;
    IF v_employee IS NULL THEN
      v_missing := v_missing + 1;
      CONTINUE;
    END IF;

    v_target_route := public.find_or_create_split_route_for_employee(
      s.business_id, v_employee, _target_date, s.route_id
    );

    PERFORM pg_advisory_xact_lock(hashtext('route_stops_route:' || v_target_route::text));

    SELECT EXISTS (
      SELECT 1 FROM public.route_stops t
       WHERE t.route_id = v_target_route
         AND (
           (s.order_id IS NOT NULL AND t.order_id = s.order_id)
           OR (s.subscription_id IS NOT NULL AND t.subscription_id = s.subscription_id)
           OR (s.agreement_occurrence_id IS NOT NULL AND t.agreement_occurrence_id = s.agreement_occurrence_id)
         )
    ) INTO v_conflict;

    IF v_conflict THEN
      DELETE FROM public.route_stops WHERE id = s.id;
      v_moved := v_moved + 1;
      CONTINUE;
    END IF;

    SELECT COALESCE(MAX(sequence), -1) + 1 INTO v_seq
      FROM public.route_stops WHERE route_id = v_target_route;

    UPDATE public.route_stops
       SET route_id = v_target_route, sequence = v_seq, planned_arrival = NULL
     WHERE id = s.id
       AND route_id <> v_target_route
       AND NOT EXISTS (
         SELECT 1 FROM public.route_stops t
          WHERE t.route_id = v_target_route
            AND t.id <> s.id
            AND (
              (s.order_id IS NOT NULL AND t.order_id = s.order_id)
              OR (s.subscription_id IS NOT NULL AND t.subscription_id = s.subscription_id)
              OR (s.agreement_occurrence_id IS NOT NULL AND t.agreement_occurrence_id = s.agreement_occurrence_id)
            )
       );

    IF FOUND THEN v_moved := v_moved + 1; END IF;
  END LOOP;

  RETURN QUERY SELECT v_moved, v_missing;
END;
$function$;

-- Serialize drag/drop reorder operations that may also move a stop between routes.
CREATE OR REPLACE FUNCTION public.reorder_route_stops(_updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_route_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  FOR v_route_id IN
    WITH u AS (
      SELECT (x->>'id')::uuid AS id, NULLIF(x->>'route_id','')::uuid AS route_id
      FROM jsonb_array_elements(_updates) AS x
    )
    SELECT DISTINCT rid FROM (
      SELECT COALESCE(u.route_id, s.route_id) AS rid FROM u JOIN public.route_stops s ON s.id = u.id
      UNION
      SELECT s.route_id AS rid FROM u JOIN public.route_stops s ON s.id = u.id
    ) q
    WHERE rid IS NOT NULL
    ORDER BY rid
  LOOP
    PERFORM pg_advisory_xact_lock(hashtext('route_stops_route:' || v_route_id::text));
  END LOOP;

  WITH u AS (
    SELECT
      (x->>'id')::uuid AS id,
      (x->>'sequence')::int AS sequence,
      NULLIF(x->>'route_id','')::uuid AS route_id
    FROM jsonb_array_elements(_updates) AS x
  ),
  resolved AS (
    SELECT u.id, u.sequence,
           COALESCE(u.route_id, s.route_id) AS new_route_id,
           s.route_id AS cur_route_id,
           s.order_id, s.subscription_id, s.agreement_occurrence_id
      FROM u
      JOIN public.route_stops s ON s.id = u.id
  ),
  safe AS (
    SELECT r.* FROM resolved r
     WHERE r.new_route_id = r.cur_route_id
        OR NOT EXISTS (
          SELECT 1 FROM public.route_stops t
           WHERE t.route_id = r.new_route_id
             AND t.id <> r.id
             AND (
               (r.order_id IS NOT NULL AND t.order_id = r.order_id)
               OR (r.subscription_id IS NOT NULL AND t.subscription_id = r.subscription_id)
               OR (r.agreement_occurrence_id IS NOT NULL AND t.agreement_occurrence_id = r.agreement_occurrence_id)
             )
        )
  )
  UPDATE public.route_stops s
     SET sequence = safe.sequence,
         route_id = safe.new_route_id
    FROM safe
   WHERE s.id = safe.id;
END;
$function$;

-- Make automatic occurrence materialization route creation race-safe.
CREATE OR REPLACE FUNCTION public._materialize_single_occurrence(_occurrence_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_route_id uuid; v_seq int; v_planned_arrival timestamptz;
  v_o RECORD; v_a RECORD;
  v_tpl_id uuid; v_tpl_name text; v_tpl_color text; v_tpl_time time;
  v_tpl_emp uuid; v_tpl_addr text; v_tpl_lat numeric; v_tpl_lng numeric; v_tpl_home boolean;
BEGIN
  SELECT * INTO v_o FROM public.agreement_occurrences WHERE id = _occurrence_id;
  IF NOT FOUND OR v_o.route_id IS NOT NULL OR v_o.status <> 'planned' THEN RETURN; END IF;

  IF v_o.occurrence_date < CURRENT_DATE THEN
    INSERT INTO public.route_planner_events (business_id, event_type, severity, projected_date, details)
    VALUES (v_o.business_id, 'materialize_occurrence_rejected_past_date', 'warning',
            v_o.occurrence_date, jsonb_build_object('occurrence_id', v_o.id, 'today', CURRENT_DATE));
    RETURN;
  END IF;

  SELECT * INTO v_a FROM public.agreements WHERE id = v_o.agreement_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_tpl_id := v_a.default_route_template_id;
  IF v_tpl_id IS NULL THEN RETURN; END IF;

  PERFORM pg_advisory_xact_lock(hashtext('route_template_date:' || v_o.business_id::text || ':' || v_o.occurrence_date::text || ':' || v_tpl_id::text));

  SELECT name, color, planned_start_time, default_employee_id,
         start_address, start_latitude, start_longitude, start_from_home
    INTO v_tpl_name, v_tpl_color, v_tpl_time, v_tpl_emp,
         v_tpl_addr, v_tpl_lat, v_tpl_lng, v_tpl_home
  FROM public.route_templates WHERE id = v_tpl_id;

  SELECT id INTO v_route_id FROM public.routes
  WHERE business_id = v_o.business_id AND route_date = v_o.occurrence_date
    AND route_template_id = v_tpl_id
    AND archived_at IS NULL AND deleted_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_route_id IS NULL THEN
    INSERT INTO public.routes (
      business_id, route_date, status, name, color, planned_start_time,
      start_address, start_latitude, start_longitude, start_from_home,
      route_template_id, employee_id
    ) VALUES (
      v_o.business_id, v_o.occurrence_date, 'planned',
      COALESCE(v_tpl_name, 'Aftaler'), COALESCE(v_tpl_color, '#14b8a6'),
      COALESCE(v_tpl_time, '08:00'::time),
      v_tpl_addr, v_tpl_lat, v_tpl_lng, COALESCE(v_tpl_home, false),
      v_tpl_id, v_tpl_emp
    ) RETURNING id INTO v_route_id;

    IF v_tpl_emp IS NOT NULL THEN
      INSERT INTO public.route_employees (route_id, employee_id)
      VALUES (v_route_id, v_tpl_emp) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('route_stops_route:' || v_route_id::text));

  SELECT COALESCE(MAX(sequence), -1) + 1 INTO v_seq FROM public.route_stops WHERE route_id = v_route_id;

  v_planned_arrival := v_o.planned_arrival;
  IF v_planned_arrival IS NULL AND v_a.preferred_time_start IS NOT NULL THEN
    v_planned_arrival := ((v_o.occurrence_date::timestamp + v_a.preferred_time_start) AT TIME ZONE 'Europe/Copenhagen');
  END IF;

  INSERT INTO public.route_stops (route_id, agreement_occurrence_id, sequence, status, planned_arrival)
  VALUES (v_route_id, v_o.id, v_seq, 'planned', v_planned_arrival)
  ON CONFLICT DO NOTHING;

  UPDATE public.agreement_occurrences SET route_id = v_route_id WHERE id = v_o.id;
END;
$function$;
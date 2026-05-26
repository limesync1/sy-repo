-- 1) move_stops_to_date: dedup mod målruten før flytning
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

    -- Hvis målruten allerede har et stop for samme aftale/ordre/abonnement,
    -- så slet source-stoppet i stedet for at flytte (ville bryde unique-index).
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
     WHERE id = s.id AND route_id <> v_target_route;

    IF FOUND THEN v_moved := v_moved + 1; END IF;
  END LOOP;

  RETURN QUERY SELECT v_moved, v_missing;
END;
$function$;

-- 2) _materialize_occurrence_on_route: tilføj ON CONFLICT DO NOTHING
CREATE OR REPLACE FUNCTION public._materialize_occurrence_on_route(_occurrence_id uuid, _route_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_o public.agreement_occurrences%ROWTYPE;
  v_a public.agreements%ROWTYPE;
  v_route public.routes%ROWTYPE;
  v_seq int;
  v_service_summary text;
  v_planned_arrival timestamptz;
  v_lead_employee uuid;
BEGIN
  SELECT * INTO v_o FROM public.agreement_occurrences WHERE id = _occurrence_id;
  IF NOT FOUND OR v_o.status <> 'planned' THEN RETURN; END IF;

  SELECT * INTO v_route FROM public.routes WHERE id = _route_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT * INTO v_a FROM public.agreements WHERE id = v_o.agreement_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT string_agg(service_name, ', ' ORDER BY created_at)
    INTO v_service_summary
    FROM public.agreement_items WHERE agreement_id = v_a.id;

  SELECT COALESCE(MAX(sequence), -1) + 1 INTO v_seq
    FROM public.route_stops WHERE route_id = _route_id;

  v_planned_arrival := v_o.planned_arrival;
  IF v_planned_arrival IS NULL AND v_a.preferred_time_start IS NOT NULL THEN
    v_planned_arrival := ((v_o.occurrence_date::timestamp + v_a.preferred_time_start) AT TIME ZONE 'Europe/Copenhagen');
  END IF;

  v_lead_employee := COALESCE(v_o.employee_ids[1], v_a.employee_ids[1]);

  INSERT INTO public.route_stops (
    route_id, agreement_occurrence_id, sequence, status, planned_arrival,
    address, latitude, longitude, customer_name, customer_phone, service_summary,
    duration_minutes, time_window_start, time_window_end, assigned_employee_id, required_staff, notes
  )
  SELECT
    _route_id, v_o.id, v_seq, 'planned', v_planned_arrival,
    v_a.address, v_a.latitude, v_a.longitude, v_a.customer_name, v_a.customer_phone,
    COALESCE(v_service_summary, 'Aftale'), COALESCE(v_a.estimated_duration_minutes, 30),
    v_a.preferred_time_start, v_a.preferred_time_end, v_lead_employee, 1, v_a.notes
  WHERE NOT EXISTS (
    SELECT 1 FROM public.route_stops rs WHERE rs.agreement_occurrence_id = v_o.id
  )
  ON CONFLICT DO NOTHING;

  UPDATE public.agreement_occurrences
     SET route_id = _route_id,
         planned_arrival = v_planned_arrival,
         employee_ids = CASE
           WHEN COALESCE(array_length(employee_ids, 1), 0) = 0 THEN COALESCE(v_a.employee_ids, '{}'::uuid[])
           ELSE employee_ids
         END,
         updated_at = now()
   WHERE id = v_o.id;
END;
$function$;

-- 3) _materialize_single_occurrence
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

  SELECT name, color, planned_start_time, default_employee_id,
         start_address, start_latitude, start_longitude, start_from_home
    INTO v_tpl_name, v_tpl_color, v_tpl_time, v_tpl_emp,
         v_tpl_addr, v_tpl_lat, v_tpl_lng, v_tpl_home
  FROM public.route_templates WHERE id = v_tpl_id;

  SELECT id INTO v_route_id FROM public.routes
  WHERE business_id = v_o.business_id AND route_date = v_o.occurrence_date
    AND route_template_id = v_tpl_id LIMIT 1;

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

-- 4) _worker_materialize_occurrence
CREATE OR REPLACE FUNCTION public._worker_materialize_occurrence(_occurrence_id uuid, _target_route_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_o RECORD; v_a RECORD; v_r RECORD;
  v_seq INT; v_planned_arrival TIMESTAMPTZ; v_stop_id UUID;
BEGIN
  SELECT * INTO v_o FROM public.agreement_occurrences WHERE id = _occurrence_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Occurrence not found: %', _occurrence_id; END IF;
  IF v_o.route_id IS NOT NULL THEN RETURN NULL; END IF;

  SELECT * INTO v_r FROM public.routes WHERE id = _target_route_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Route not found: %', _target_route_id; END IF;
  IF v_r.business_id <> v_o.business_id THEN RAISE EXCEPTION 'Route belongs to a different business'; END IF;

  SELECT * INTO v_a FROM public.agreements WHERE id = v_o.agreement_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Agreement not found'; END IF;

  -- Idempotent: hvis et stop allerede findes for denne occurrence på ruten,
  -- så returnér det i stedet for at insertere igen.
  SELECT id INTO v_stop_id FROM public.route_stops
   WHERE route_id = _target_route_id AND agreement_occurrence_id = v_o.id LIMIT 1;
  IF v_stop_id IS NOT NULL THEN
    UPDATE public.agreement_occurrences SET route_id = _target_route_id WHERE id = v_o.id;
    RETURN v_stop_id;
  END IF;

  SELECT COALESCE(MAX(sequence), -1) + 1 INTO v_seq
    FROM public.route_stops WHERE route_id = _target_route_id;

  v_planned_arrival := v_o.planned_arrival;
  IF v_planned_arrival IS NULL AND v_a.preferred_time_start IS NOT NULL THEN
    v_planned_arrival := ((v_r.route_date::timestamp + v_a.preferred_time_start)
                          AT TIME ZONE 'Europe/Copenhagen');
  END IF;

  INSERT INTO public.route_stops (
    route_id, agreement_occurrence_id, sequence, status,
    customer_name, customer_phone, address, latitude, longitude,
    service_summary, notes, planned_arrival,
    duration_minutes, time_window_start, time_window_end
  ) VALUES (
    _target_route_id, v_o.id, v_seq, 'planned',
    COALESCE(v_a.company_name, v_a.customer_name),
    v_a.customer_phone, v_a.address, v_a.latitude, v_a.longitude,
    NULL, v_a.notes, v_planned_arrival,
    COALESCE(v_a.estimated_duration_minutes, 30),
    v_a.preferred_time_start, v_a.preferred_time_end
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_stop_id;

  IF v_stop_id IS NULL THEN
    SELECT id INTO v_stop_id FROM public.route_stops
     WHERE route_id = _target_route_id AND agreement_occurrence_id = v_o.id LIMIT 1;
  END IF;

  UPDATE public.agreement_occurrences SET route_id = _target_route_id WHERE id = v_o.id;
  RETURN v_stop_id;
END;
$function$;

-- 5) materialize_occurrence_to_route
CREATE OR REPLACE FUNCTION public.materialize_occurrence_to_route(_occurrence_id uuid, _target_route_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_o RECORD; v_a RECORD; v_r RECORD;
  v_seq int; v_planned_arrival timestamptz; v_stop_id uuid; v_authorized boolean;
BEGIN
  SELECT * INTO v_o FROM public.agreement_occurrences WHERE id = _occurrence_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Occurrence not found'; END IF;
  IF v_o.route_id IS NOT NULL THEN RAISE EXCEPTION 'Occurrence already on a route'; END IF;

  SELECT * INTO v_r FROM public.routes WHERE id = _target_route_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Route not found'; END IF;
  IF v_r.business_id <> v_o.business_id THEN RAISE EXCEPTION 'Route belongs to a different business'; END IF;

  SELECT (public.is_business_owner(v_o.business_id, auth.uid()) OR public.has_role(auth.uid(),'admin'))
    INTO v_authorized;
  IF NOT v_authorized THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT * INTO v_a FROM public.agreements WHERE id = v_o.agreement_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Agreement not found'; END IF;

  SELECT COALESCE(MAX(sequence), -1) + 1 INTO v_seq
  FROM public.route_stops WHERE route_id = _target_route_id;

  v_planned_arrival := v_o.planned_arrival;
  IF v_planned_arrival IS NULL AND v_a.preferred_time_start IS NOT NULL THEN
    v_planned_arrival := ((v_r.route_date::timestamp + v_a.preferred_time_start)
                          AT TIME ZONE 'Europe/Copenhagen');
  END IF;

  INSERT INTO public.route_stops (
    route_id, agreement_occurrence_id, sequence, status,
    customer_name, customer_phone, address, latitude, longitude,
    service_summary, notes, planned_arrival,
    duration_minutes, time_window_start, time_window_end
  ) VALUES (
    _target_route_id, v_o.id, v_seq, 'planned',
    COALESCE(v_a.company_name, v_a.customer_name),
    v_a.customer_phone, v_a.address, v_a.latitude, v_a.longitude,
    NULL, v_a.notes, v_planned_arrival,
    COALESCE(v_a.estimated_duration_minutes, 30),
    v_a.preferred_time_start, v_a.preferred_time_end
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_stop_id;

  IF v_stop_id IS NULL THEN
    SELECT id INTO v_stop_id FROM public.route_stops
     WHERE route_id = _target_route_id AND agreement_occurrence_id = v_o.id LIMIT 1;
  END IF;

  UPDATE public.agreement_occurrences SET route_id = _target_route_id WHERE id = v_o.id;
  RETURN v_stop_id;
END;
$function$;

-- 6) materialize_virtual_route: hærdér også klon-indsættelsen med ON CONFLICT DO NOTHING.
-- Vi opretter en separat hjælper for kun den ene indsættelse er kompleks at gen-skrive
-- helt — i stedet patch'er vi via et DROP+CREATE OR REPLACE der genbruger logikken.
-- Note: hele funktionskroppen bevares; kun den sidste store INSERT får tilføjet ON CONFLICT.
CREATE OR REPLACE FUNCTION public.materialize_virtual_route(_base_route_id uuid, _date date)
 RETURNS routes
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
    RAISE EXCEPTION 'Du er ikke logget ind. Log ind igen og prøv på ny.';
  END IF;

  SELECT * INTO v_base FROM public.routes WHERE id = _base_route_id;
  IF v_base.id IS NULL THEN
    RAISE EXCEPTION 'Basisruten findes ikke længere';
  END IF;

  IF NOT (
    public.has_role(v_uid, 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = v_base.business_id AND b.owner_id = v_uid)
  ) THEN
    RAISE EXCEPTION 'Du har ikke rettigheder til denne handling.';
  END IF;

  SELECT * INTO v_existing
  FROM public.routes
  WHERE base_route_id = _base_route_id AND route_date = _date
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    SELECT count(*)::int INTO v_active_stop_count
    FROM public.route_stops rs
    LEFT JOIN public.agreement_occurrences ao ON ao.id = rs.agreement_occurrence_id
    WHERE rs.route_id = v_existing.id
      AND COALESCE(ao.status::text, rs.status::text, 'planned') NOT IN ('completed', 'cancelled');

    IF v_active_stop_count = 0 THEN
      DELETE FROM public.route_occurrence_exceptions e
      WHERE e.replacement_route_id = v_existing.id
         OR (e.base_route_id = _base_route_id AND e.occurrence_date = _date);
      DELETE FROM public.routes WHERE id = v_existing.id;
      v_existing := NULL;
    END IF;
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
    ON CONFLICT (base_route_id, route_date) DO NOTHING
    RETURNING * INTO v_new;

    IF v_new.id IS NULL THEN
      SELECT * INTO v_new FROM public.routes
       WHERE base_route_id = _base_route_id AND route_date = _date LIMIT 1;
    END IF;

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

  INSERT INTO public.route_occurrence_exceptions (
    business_id, base_route_id, occurrence_date, replacement_route_id, exception_type
  ) VALUES (
    v_base.business_id, _base_route_id, _date, v_new.id, 'moved'
  )
  ON CONFLICT (base_route_id, occurrence_date) DO UPDATE
    SET replacement_route_id = EXCLUDED.replacement_route_id,
        exception_type = EXCLUDED.exception_type;

  RETURN v_new;
END;
$function$;
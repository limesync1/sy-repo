CREATE OR REPLACE FUNCTION public.find_or_create_route_for_employee(
  _business_id uuid,
  _employee_id uuid,
  _route_date date,
  _source_route_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_route_id uuid;
  v_color text;
  v_source_name text;
  v_name text;
  v_start_addr text;
  v_start_lat numeric;
  v_start_lng numeric;
  v_planned_start time;
  v_start_from_home boolean;
BEGIN
  -- Reuse only a route that already belongs to the same employee on the target date.
  -- Do not fall back to any route on that date; that can merge appointments into
  -- the wrong route and look like duplicates.
  IF _employee_id IS NOT NULL THEN
    SELECT r.id INTO v_route_id
      FROM public.routes r
     WHERE r.business_id = _business_id
       AND r.route_date = _route_date
       AND (r.employee_id = _employee_id
            OR EXISTS (
                 SELECT 1 FROM public.route_employees re
                  WHERE re.route_id = r.id AND re.employee_id = _employee_id))
     ORDER BY r.created_at ASC
     LIMIT 1;
    IF v_route_id IS NOT NULL THEN RETURN v_route_id; END IF;
  END IF;

  IF _source_route_id IS NOT NULL THEN
    SELECT name, color, start_address, start_latitude, start_longitude,
           planned_start_time, start_from_home
      INTO v_source_name, v_color, v_start_addr, v_start_lat, v_start_lng,
           v_planned_start, v_start_from_home
      FROM public.routes
     WHERE id = _source_route_id;
  END IF;

  IF v_color IS NULL THEN v_color := public.pick_route_color(_business_id, _route_date); END IF;
  IF v_color IS NULL THEN v_color := '#14b8a6'; END IF;
  IF v_planned_start IS NULL THEN v_planned_start := '08:00:00'::time; END IF;

  -- Manual split/move routes must be independent instances. They get a clear
  -- date-specific name and no route_template_id, so editing them cannot rename
  -- or otherwise affect the source route/series.
  v_name := COALESCE(NULLIF(trim(v_source_name), ''), 'Rute') || ' — ' || to_char(_route_date, 'DD/MM');

  INSERT INTO public.routes (
    business_id, employee_id, route_date, status, name, color,
    start_address, start_latitude, start_longitude, planned_start_time,
    start_from_home, route_template_id
  ) VALUES (
    _business_id, _employee_id, _route_date, 'planned',
    v_name, v_color,
    v_start_addr, v_start_lat, v_start_lng, v_planned_start,
    COALESCE(v_start_from_home, false), NULL
  ) RETURNING id INTO v_route_id;

  IF _employee_id IS NOT NULL THEN
    INSERT INTO public.route_employees (route_id, employee_id, role)
    VALUES (v_route_id, _employee_id, 'driver')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_route_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_stops_to_date(
  _stop_ids uuid[],
  _target_date date
) RETURNS TABLE(moved_count int, missing_employee_count int)
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
BEGIN
  FOR s IN
    SELECT rs.id, rs.route_id, rs.assigned_employee_id,
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
      SELECT employee_id INTO v_employee
        FROM public.route_stop_assignees
       WHERE stop_id = s.id
       ORDER BY is_lead DESC NULLS LAST, created_at ASC
       LIMIT 1;
    END IF;

    IF v_employee IS NULL THEN
      v_employee := s.source_route_employee;
    END IF;

    IF v_employee IS NULL THEN
      SELECT employee_id INTO v_employee
        FROM public.route_employees
       WHERE route_id = s.route_id
       ORDER BY created_at ASC
       LIMIT 1;
    END IF;

    IF v_employee IS NULL THEN
      v_missing := v_missing + 1;
      CONTINUE;
    END IF;

    v_target_route := public.find_or_create_route_for_employee(
      s.business_id, v_employee, _target_date, s.route_id
    );

    SELECT COALESCE(MAX(sequence), -1) + 1 INTO v_seq
      FROM public.route_stops
     WHERE route_id = v_target_route;

    UPDATE public.route_stops
       SET route_id = v_target_route,
           sequence = v_seq,
           planned_arrival = NULL
     WHERE id = s.id
       AND route_id <> v_target_route;

    IF FOUND THEN
      v_moved := v_moved + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_moved, v_missing;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.move_stops_to_date(uuid[], date) TO authenticated;
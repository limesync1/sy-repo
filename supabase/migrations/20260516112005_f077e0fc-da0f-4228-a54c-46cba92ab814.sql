CREATE OR REPLACE FUNCTION public.create_route_fast(_business_id uuid, _route_date date, _name text DEFAULT NULL, _color text DEFAULT NULL)
RETURNS public.routes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_addr text;
  v_zip text;
  v_city text;
  v_start_address text;
  v_row public.routes;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Du er ikke logget ind. Log ind igen og prøv på ny.';
  END IF;
  IF NOT (
    public.has_role(v_uid, 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = _business_id AND b.owner_id = v_uid)
  ) THEN
    RAISE EXCEPTION 'Du har ikke rettigheder til denne handling.';
  END IF;

  SELECT b.address, b.zip_code, b.city INTO v_addr, v_zip, v_city
  FROM public.businesses b WHERE b.id = _business_id;
  v_start_address := NULLIF(
    trim(both ', ' FROM COALESCE(v_addr,'') || ', ' || trim(COALESCE(v_zip,'') || ' ' || COALESCE(v_city,''))),
    ''
  );

  INSERT INTO public.routes (
    business_id, route_date, name, color, start_address
  ) VALUES (
    _business_id, _route_date, NULLIF(_name,''), COALESCE(_color,'#14b8a6'), v_start_address
  ) RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.materialize_virtual_route(_base_route_id uuid, _date date)
RETURNS public.routes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_base public.routes;
  v_existing public.routes;
  v_new public.routes;
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
    RETURN v_existing;
  END IF;

  INSERT INTO public.routes (
    business_id, route_date, name, color, start_address,
    start_latitude, start_longitude, planned_start_time, start_from_home,
    notes, base_route_id
  ) VALUES (
    v_base.business_id, _date, v_base.name, v_base.color, v_base.start_address,
    v_base.start_latitude, v_base.start_longitude, v_base.planned_start_time, COALESCE(v_base.start_from_home, false),
    v_base.notes, _base_route_id
  )
  ON CONFLICT (base_route_id, route_date) DO NOTHING
  RETURNING * INTO v_new;

  IF v_new.id IS NULL THEN
    SELECT * INTO v_new
    FROM public.routes
    WHERE base_route_id = _base_route_id AND route_date = _date
    LIMIT 1;
    RETURN v_new;
  END IF;

  WITH base_stops AS (
    SELECT id, sequence, address, latitude, longitude, customer_name, customer_phone,
           service_summary, duration_minutes, time_window_start, time_window_end,
           assigned_employee_id, required_staff, notes
    FROM public.route_stops
    WHERE route_id = _base_route_id
    ORDER BY sequence ASC
  ),
  inserted AS (
    INSERT INTO public.route_stops (
      route_id, sequence, status, address, latitude, longitude,
      customer_name, customer_phone, service_summary, duration_minutes,
      time_window_start, time_window_end, assigned_employee_id, required_staff, notes
    )
    SELECT v_new.id, COALESCE(sequence, 0), 'pending', address, latitude, longitude,
           customer_name, customer_phone, service_summary, COALESCE(duration_minutes,30),
           time_window_start, time_window_end, assigned_employee_id, COALESCE(required_staff,1), notes
    FROM base_stops
    RETURNING id, sequence
  ),
  id_map AS (
    SELECT b.id AS old_id, i.id AS new_id
    FROM base_stops b
    JOIN inserted i ON i.sequence = COALESCE(b.sequence, 0)
  )
  INSERT INTO public.route_stop_assignees (stop_id, employee_id)
  SELECT m.new_id, a.employee_id
  FROM public.route_stop_assignees a
  JOIN id_map m ON m.old_id = a.stop_id
  ON CONFLICT DO NOTHING;

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
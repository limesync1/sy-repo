
-- Stop SQL fra at sætte auto-genererede dato-navne på nye ruter.
-- Frontenden har én fælles fallback ("Rute (D. MMM)") som skal eje navngivningen.

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
  v_name text;
  v_template_id uuid;
  v_start_addr text;
  v_start_lat numeric;
  v_start_lng numeric;
  v_planned_start time;
  v_start_from_home boolean;
BEGIN
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
           planned_start_time, start_from_home, route_template_id
      INTO v_name, v_color, v_start_addr, v_start_lat, v_start_lng,
           v_planned_start, v_start_from_home, v_template_id
      FROM public.routes
     WHERE id = _source_route_id;

    -- Arv kildens navn AS-IS. Tilføj ALDRIG dato — frontenden gør det.
    IF v_name IS NOT NULL AND length(trim(v_name)) = 0 THEN
      v_name := NULL;
    END IF;

    IF v_template_id IS NULL AND v_name IS NOT NULL THEN
      INSERT INTO public.route_templates (business_id, name, color, is_active)
      VALUES (_business_id, v_name, COALESCE(v_color, '#14b8a6'), true)
      RETURNING id INTO v_template_id;
      UPDATE public.routes SET route_template_id = v_template_id WHERE id = _source_route_id;
    END IF;
  END IF;

  IF v_color IS NULL THEN v_color := public.pick_route_color(_business_id, _route_date); END IF;
  IF v_color IS NULL THEN v_color := '#14b8a6'; END IF;
  IF v_planned_start IS NULL THEN v_planned_start := '08:00:00'::time; END IF;

  INSERT INTO public.routes (
    business_id, employee_id, route_date, status, name, color,
    start_address, start_latitude, start_longitude, planned_start_time,
    start_from_home, route_template_id
  ) VALUES (
    _business_id, _employee_id, _route_date, 'planned',
    v_name, v_color,
    v_start_addr, v_start_lat, v_start_lng, v_planned_start,
    COALESCE(v_start_from_home, false), v_template_id
  ) RETURNING id INTO v_route_id;

  IF _employee_id IS NOT NULL THEN
    INSERT INTO public.route_employees (route_id, employee_id, role)
    VALUES (v_route_id, _employee_id, 'driver')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_route_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.find_or_create_split_route_for_employee(
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

  -- Arv kildens navn AS-IS uden dato-suffix; ellers NULL så frontenden styrer fallback.
  v_name := NULLIF(trim(COALESCE(v_source_name, '')), '');

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

-- Backfill: ryd auto-genererede dato-navne på eksisterende ruter, så samme
-- rute viser samme navn overalt. Matcher præcist de to historiske formater:
--   "Rute — DD/MM"          (split-route auto)
--   "Rute DD-MM-YYYY"       (employee-route auto)
-- Brugerens egne navne (alt andet) røres ikke.
UPDATE public.routes
   SET name = NULL
 WHERE name ~ '^Rute — [0-9]{2}/[0-9]{2}$'
    OR name ~ '^Rute [0-9]{2}-[0-9]{2}-[0-9]{4}$';

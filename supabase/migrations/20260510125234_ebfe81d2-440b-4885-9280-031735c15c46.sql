
-- 1) Backfill: create a route_templates row per (business_id, name) group with multiple routes, then link
WITH grp AS (
  SELECT business_id, name, COUNT(*) AS n
    FROM public.routes
   WHERE route_template_id IS NULL
     AND name IS NOT NULL
     AND length(trim(name)) > 0
   GROUP BY business_id, name
  HAVING COUNT(*) >= 2
), inserted AS (
  INSERT INTO public.route_templates (business_id, name, color, is_active)
  SELECT g.business_id, g.name,
         (SELECT r.color FROM public.routes r
           WHERE r.business_id = g.business_id AND r.name = g.name AND r.color IS NOT NULL
           ORDER BY r.created_at DESC LIMIT 1),
         true
    FROM grp g
  RETURNING id, business_id, name
)
UPDATE public.routes r
   SET route_template_id = i.id
  FROM inserted i
 WHERE r.business_id = i.business_id
   AND r.name = i.name
   AND r.route_template_id IS NULL;

-- 2) Update find_or_create_route_for_employee to copy name + route_template_id from source
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

  SELECT r.id INTO v_route_id
    FROM public.routes r
   WHERE r.business_id = _business_id
     AND r.route_date = _route_date
   ORDER BY r.created_at ASC
   LIMIT 1;
  IF v_route_id IS NOT NULL THEN RETURN v_route_id; END IF;

  IF _source_route_id IS NOT NULL THEN
    SELECT name, color, start_address, start_latitude, start_longitude,
           planned_start_time, start_from_home, route_template_id
      INTO v_name, v_color, v_start_addr, v_start_lat, v_start_lng,
           v_planned_start, v_start_from_home, v_template_id
      FROM public.routes WHERE id = _source_route_id;

    -- If source route has no series yet, create one and link the source
    IF v_template_id IS NULL THEN
      INSERT INTO public.route_templates (business_id, name, color, is_active)
      VALUES (_business_id, v_name, COALESCE(v_color, '#14b8a6'), true)
      RETURNING id INTO v_template_id;
      UPDATE public.routes SET route_template_id = v_template_id WHERE id = _source_route_id;
    END IF;
  END IF;

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
    INSERT INTO public.route_employees (route_id, employee_id, is_lead)
    VALUES (v_route_id, _employee_id, true)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_route_id;
END;
$function$;

-- 3) Trigger: propagate route field edits to all other routes in the same series
CREATE OR REPLACE FUNCTION public.propagate_route_series_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.route_template_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.name IS NOT DISTINCT FROM OLD.name
     AND NEW.color IS NOT DISTINCT FROM OLD.color
     AND NEW.start_address IS NOT DISTINCT FROM OLD.start_address
     AND NEW.start_latitude IS NOT DISTINCT FROM OLD.start_latitude
     AND NEW.start_longitude IS NOT DISTINCT FROM OLD.start_longitude
     AND NEW.planned_start_time IS NOT DISTINCT FROM OLD.planned_start_time
     AND NEW.start_from_home IS NOT DISTINCT FROM OLD.start_from_home
     AND NEW.notes IS NOT DISTINCT FROM OLD.notes THEN
    RETURN NEW;
  END IF;

  UPDATE public.routes
     SET name = NEW.name,
         color = NEW.color,
         start_address = NEW.start_address,
         start_latitude = NEW.start_latitude,
         start_longitude = NEW.start_longitude,
         planned_start_time = NEW.planned_start_time,
         start_from_home = NEW.start_from_home,
         notes = NEW.notes,
         updated_at = now()
   WHERE route_template_id = NEW.route_template_id
     AND id <> NEW.id;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_propagate_route_series_update ON public.routes;
CREATE TRIGGER trg_propagate_route_series_update
AFTER UPDATE OF name, color, start_address, start_latitude, start_longitude,
                planned_start_time, start_from_home, notes
ON public.routes
FOR EACH ROW
EXECUTE FUNCTION public.propagate_route_series_update();

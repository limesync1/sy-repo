-- 1) Make _materialize_single_occurrence skip when no default route template,
--    so unassigned agreements stay visible in the "Aftaler uden rute" pool.
CREATE OR REPLACE FUNCTION public._materialize_single_occurrence(_occurrence_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_route_id uuid;
  v_seq int;
  v_planned_arrival timestamptz;
  v_o RECORD;
  v_a RECORD;
  v_tpl_id uuid;
  v_tpl_name text;
  v_tpl_color text;
  v_tpl_time time;
  v_tpl_emp uuid;
  v_tpl_addr text;
  v_tpl_lat numeric;
  v_tpl_lng numeric;
  v_tpl_home boolean;
BEGIN
  SELECT * INTO v_o FROM public.agreement_occurrences WHERE id = _occurrence_id;
  IF NOT FOUND OR v_o.route_id IS NOT NULL OR v_o.status <> 'planned' THEN RETURN; END IF;

  SELECT * INTO v_a FROM public.agreements WHERE id = v_o.agreement_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_tpl_id := v_a.default_route_template_id;

  -- Vigtigt: Hvis aftalen ikke har en standard-rute (skabelon), så LAD VÆRE
  -- med at oprette en automatisk "Aftaler"-rute. Forekomsten skal i stedet
  -- ligge i poolen "Aftaler uden rute" så ejeren selv vælger en konkret rute.
  IF v_tpl_id IS NULL THEN
    RETURN;
  END IF;

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
      COALESCE(v_tpl_name, 'Aftaler'),
      COALESCE(v_tpl_color, '#14b8a6'),
      COALESCE(v_tpl_time, '08:00'::time),
      v_tpl_addr, v_tpl_lat, v_tpl_lng,
      COALESCE(v_tpl_home, false),
      v_tpl_id,
      v_tpl_emp
    ) RETURNING id INTO v_route_id;

    IF v_tpl_emp IS NOT NULL THEN
      INSERT INTO public.route_employees (route_id, employee_id)
      VALUES (v_route_id, v_tpl_emp) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  SELECT COALESCE(MAX(sequence), -1) + 1 INTO v_seq
  FROM public.route_stops WHERE route_id = v_route_id;

  v_planned_arrival := v_o.planned_arrival;
  IF v_planned_arrival IS NULL AND v_a.preferred_time_start IS NOT NULL THEN
    v_planned_arrival := ((v_o.occurrence_date::timestamp + v_a.preferred_time_start)
                          AT TIME ZONE 'Europe/Copenhagen');
  END IF;

  INSERT INTO public.route_stops (
    route_id, agreement_occurrence_id, sequence, status, planned_arrival
  ) VALUES (
    v_route_id, v_o.id, v_seq, 'planned', v_planned_arrival
  );

  UPDATE public.agreement_occurrences SET route_id = v_route_id WHERE id = v_o.id;
END;
$function$;

-- 2) Frigør eksisterende forekomster der blev auto-tildelt en generisk
--    "Aftaler"-rute (hvor tilhørende aftale IKKE har en standard-skabelon).
WITH offending_stops AS (
  SELECT rs.id AS stop_id, rs.route_id, o.id AS occ_id
  FROM public.route_stops rs
  JOIN public.agreement_occurrences o ON o.id = rs.agreement_occurrence_id
  JOIN public.agreements a ON a.id = o.agreement_id
  JOIN public.routes r ON r.id = rs.route_id
  WHERE a.default_route_template_id IS NULL
    AND r.route_template_id IS NULL
    AND r.name = 'Aftaler'
    AND r.status = 'planned'
)
DELETE FROM public.route_stops WHERE id IN (SELECT stop_id FROM offending_stops);

UPDATE public.agreement_occurrences o
SET route_id = NULL
FROM public.agreements a, public.routes r
WHERE o.agreement_id = a.id
  AND r.id = o.route_id
  AND a.default_route_template_id IS NULL
  AND r.route_template_id IS NULL
  AND r.name = 'Aftaler'
  AND r.status = 'planned';

-- 3) Slet tomme auto-genererede "Aftaler"-ruter
DELETE FROM public.routes r
WHERE r.route_template_id IS NULL
  AND r.name = 'Aftaler'
  AND r.status = 'planned'
  AND NOT EXISTS (SELECT 1 FROM public.route_stops s WHERE s.route_id = r.id);
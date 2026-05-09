
CREATE OR REPLACE FUNCTION public._materialize_single_occurrence(_occurrence_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  IF v_tpl_id IS NOT NULL THEN
    SELECT name, color, planned_start_time, default_employee_id,
           start_address, start_latitude, start_longitude, start_from_home
      INTO v_tpl_name, v_tpl_color, v_tpl_time, v_tpl_emp,
           v_tpl_addr, v_tpl_lat, v_tpl_lng, v_tpl_home
    FROM public.route_templates WHERE id = v_tpl_id;

    SELECT id INTO v_route_id FROM public.routes
    WHERE business_id = v_o.business_id AND route_date = v_o.occurrence_date
      AND route_template_id = v_tpl_id LIMIT 1;
  ELSE
    SELECT id INTO v_route_id FROM public.routes
    WHERE business_id = v_o.business_id AND route_date = v_o.occurrence_date
      AND route_template_id IS NULL AND name = 'Aftaler' LIMIT 1;
  END IF;

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
    route_id, agreement_occurrence_id, sequence, status,
    customer_name, customer_phone, address, latitude, longitude,
    service_summary, notes, planned_arrival,
    duration_minutes, time_window_start, time_window_end,
    assigned_employee_id
  ) VALUES (
    v_route_id, v_o.id, v_seq, 'planned',
    COALESCE(v_a.company_name, v_a.customer_name),
    v_a.customer_phone,
    v_a.address, v_a.latitude, v_a.longitude,
    NULL, v_a.notes, v_planned_arrival,
    COALESCE(v_a.estimated_duration_minutes, 30),
    v_a.preferred_time_start, v_a.preferred_time_end,
    v_tpl_emp
  );

  UPDATE public.agreement_occurrences SET route_id = v_route_id WHERE id = v_o.id;
END;
$$;

CREATE OR REPLACE FUNCTION public._trg_auto_materialize_occurrence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'planned' AND NEW.route_id IS NULL THEN
    PERFORM public._materialize_single_occurrence(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_materialize_occurrence ON public.agreement_occurrences;
CREATE TRIGGER trg_auto_materialize_occurrence
AFTER INSERT ON public.agreement_occurrences
FOR EACH ROW EXECUTE FUNCTION public._trg_auto_materialize_occurrence();

CREATE OR REPLACE FUNCTION public.materialize_occurrences_to_routes(_business_id uuid, _from date, _to date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_authorized boolean;
  v_id uuid;
  v_inserted int := 0;
BEGIN
  SELECT (public.is_business_owner(_business_id, auth.uid()) OR public.has_role(auth.uid(),'admin'))
    INTO v_authorized;
  IF NOT v_authorized THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  FOR v_id IN
    SELECT id FROM public.agreement_occurrences
    WHERE business_id = _business_id
      AND occurrence_date BETWEEN _from AND _to
      AND route_id IS NULL
      AND status = 'planned'
    ORDER BY occurrence_date, sequence_index
  LOOP
    PERFORM public._materialize_single_occurrence(v_id);
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.materialize_occurrences_to_routes(uuid, date, date) TO authenticated;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.agreement_occurrences
           WHERE route_id IS NULL AND status = 'planned'
             AND occurrence_date <= (current_date + interval '12 months')::date
  LOOP
    PERFORM public._materialize_single_occurrence(r.id);
  END LOOP;
END $$;

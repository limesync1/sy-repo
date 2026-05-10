DROP FUNCTION IF EXISTS public.materialize_occurrences_to_routes(uuid, date, date);

CREATE OR REPLACE FUNCTION public.open_projected_route_base(
  _business_id uuid, _base_route_id uuid, _projected_date date, _client_event_id text DEFAULT NULL::text
)
 RETURNS routes
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_base public.routes%ROWTYPE;
  v_materialized_count integer := 0;
BEGIN
  IF _projected_date IS NULL OR _projected_date < CURRENT_DATE THEN
    INSERT INTO public.route_planner_events (
      business_id, event_type, severity, base_route_id, projected_date, client_event_id, details
    ) VALUES (
      _business_id, 'projected_route_open_rejected_past_date', 'error',
      _base_route_id, _projected_date, _client_event_id,
      jsonb_build_object('reason', 'projected_date is in the past', 'today', CURRENT_DATE)
    );
    RAISE EXCEPTION 'Projicerede ruter kan ikke åbnes i fortiden (% < %)', _projected_date, CURRENT_DATE;
  END IF;

  SELECT * INTO v_base FROM public.routes
  WHERE id = _base_route_id AND business_id = _business_id;

  IF NOT FOUND THEN
    INSERT INTO public.route_planner_events (
      business_id, event_type, severity, base_route_id, projected_date, client_event_id, details
    ) VALUES (
      _business_id, 'projected_route_open_missing_base', 'error',
      _base_route_id, _projected_date, _client_event_id,
      jsonb_build_object('reason', 'base route not found')
    );
    RAISE EXCEPTION 'Basisruten findes ikke længere';
  END IF;

  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_business_owner(_business_id, auth.uid())) THEN
    RAISE EXCEPTION 'Adgang nægtet';
  END IF;

  SELECT COUNT(*) INTO v_materialized_count FROM public.routes
  WHERE business_id = _business_id AND base_route_id = _base_route_id AND route_date = _projected_date;

  INSERT INTO public.route_planner_events (
    business_id, event_type, severity, base_route_id, route_id, projected_date, client_event_id, details
  ) VALUES (
    _business_id,
    CASE WHEN v_materialized_count > 0 THEN 'projected_route_open_existing_materialization' ELSE 'projected_route_opened_base' END,
    CASE WHEN v_materialized_count > 0 THEN 'warning' ELSE 'info' END,
    _base_route_id, v_base.id, _projected_date, _client_event_id,
    jsonb_build_object('materialized_count_before_open', v_materialized_count, 'guarantee', 'open_only_no_route_insert')
  );

  RETURN v_base;
END;
$function$;

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
  VALUES (v_route_id, v_o.id, v_seq, 'planned', v_planned_arrival);

  UPDATE public.agreement_occurrences SET route_id = v_route_id WHERE id = v_o.id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.materialize_occurrences_to_routes(
  _business_id uuid, _from date, _to date
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_from date := GREATEST(COALESCE(_from, CURRENT_DATE), CURRENT_DATE);
BEGIN
  IF _to IS NULL OR _to < v_from THEN RETURN; END IF;
  FOR v_id IN
    SELECT id FROM public.agreement_occurrences
     WHERE business_id = _business_id
       AND occurrence_date BETWEEN v_from AND _to
       AND route_id IS NULL
       AND status = 'planned'
  LOOP
    PERFORM public._materialize_single_occurrence(v_id);
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_agreement_occurrence_no_past_planned()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'planned' AND NEW.occurrence_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Planlagte aftale-forekomster kan ikke oprettes i fortiden (% < %)',
      NEW.occurrence_date, CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_agreement_occurrence_no_past_planned ON public.agreement_occurrences;
CREATE TRIGGER trg_guard_agreement_occurrence_no_past_planned
BEFORE INSERT ON public.agreement_occurrences
FOR EACH ROW EXECUTE FUNCTION public.guard_agreement_occurrence_no_past_planned();
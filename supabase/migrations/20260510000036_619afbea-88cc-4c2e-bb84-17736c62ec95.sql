
CREATE OR REPLACE FUNCTION public.materialize_occurrence_to_route(_occurrence_id uuid, _target_route_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_o RECORD;
  v_a RECORD;
  v_r RECORD;
  v_seq int;
  v_planned_arrival timestamptz;
  v_stop_id uuid;
  v_authorized boolean;
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
    v_a.customer_phone,
    v_a.address, v_a.latitude, v_a.longitude,
    NULL, v_a.notes, v_planned_arrival,
    COALESCE(v_a.estimated_duration_minutes, 30),
    v_a.preferred_time_start, v_a.preferred_time_end
  ) RETURNING id INTO v_stop_id;

  UPDATE public.agreement_occurrences SET route_id = _target_route_id WHERE id = v_o.id;

  RETURN v_stop_id;
END;
$function$;

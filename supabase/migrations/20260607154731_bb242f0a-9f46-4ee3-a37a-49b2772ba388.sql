CREATE OR REPLACE FUNCTION public._agreement_occurs_on_route_date(_interval agreement_interval, _custom_days integer, _anchor_date date, _target_date date)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_duration interval;
  v_cursor date;
  v_next date;
  v_guard int := 0;
BEGIN
  IF _anchor_date IS NULL OR _target_date IS NULL OR _target_date < _anchor_date THEN
    RETURN false;
  END IF;

  v_duration := public._agreement_interval_duration(_interval, _custom_days);
  IF v_duration IS NULL THEN
    RETURN _target_date = _anchor_date;
  END IF;

  v_cursor := _anchor_date;
  WHILE v_cursor < _target_date AND v_guard < 4000 LOOP
    v_next := (v_cursor::timestamp + v_duration)::date;
    IF v_next <= v_cursor THEN
      v_next := v_cursor + 1;
    END IF;
    v_cursor := v_next;
    v_guard := v_guard + 1;
  END LOOP;

  RETURN v_cursor = _target_date;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_next_agreement_occurrence(_completed_occurrence_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $$
DECLARE
  v_occ public.agreement_occurrences%ROWTYPE;
  v_agreement public.agreements%ROWTYPE;
  v_duration interval;
  v_next_date date;
  v_next_idx int;
  v_next_id uuid;
  v_route_id uuid;
  v_planned_arrival timestamptz;
BEGIN
  SELECT * INTO v_occ FROM public.agreement_occurrences WHERE id = _completed_occurrence_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_agreement FROM public.agreements WHERE id = v_occ.agreement_id;
  IF NOT FOUND OR v_agreement.status <> 'active' THEN RETURN NULL; END IF;

  v_duration := public._agreement_interval_duration(v_agreement.interval, v_agreement.interval_days);
  IF v_duration IS NULL THEN RETURN NULL; END IF;

  v_next_date := (v_occ.occurrence_date::timestamp + v_duration)::date;
  IF v_next_date <= v_occ.occurrence_date THEN
    v_next_date := v_occ.occurrence_date + 1;
  END IF;
  IF v_agreement.end_date IS NOT NULL AND v_next_date > v_agreement.end_date THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_next_id
    FROM public.agreement_occurrences
   WHERE agreement_id = v_agreement.id
     AND occurrence_date = v_next_date
     AND completed_at IS NULL
   ORDER BY sequence_index ASC NULLS LAST
   LIMIT 1;
  IF v_next_id IS NOT NULL THEN
    RETURN v_next_id;
  END IF;

  SELECT COALESCE(MAX(sequence_index), -1) + 1 INTO v_next_idx
    FROM public.agreement_occurrences WHERE agreement_id = v_agreement.id;
  v_next_idx := GREATEST(v_next_idx, COALESCE(v_occ.sequence_index, -1) + 1);

  SELECT id INTO v_route_id
    FROM public.routes
   WHERE business_id = v_agreement.business_id
     AND route_date = v_next_date
     AND (
       id = v_agreement.preferred_route_id
       OR base_route_id = v_agreement.preferred_route_id
       OR route_template_id = v_agreement.default_route_template_id
     )
   ORDER BY CASE WHEN base_route_id = v_agreement.preferred_route_id THEN 0 ELSE 1 END, created_at
   LIMIT 1;

  IF v_agreement.preferred_time_start IS NOT NULL THEN
    v_planned_arrival := ((v_next_date::timestamp + v_agreement.preferred_time_start) AT TIME ZONE 'Europe/Copenhagen');
  ELSE
    v_planned_arrival := NULL;
  END IF;

  INSERT INTO public.agreement_occurrences (
    agreement_id, business_id, occurrence_date, sequence_index, status, route_id, planned_arrival, total_amount, created_at, updated_at
  ) VALUES (
    v_agreement.id, v_agreement.business_id, v_next_date, v_next_idx, 'planned', v_route_id, v_planned_arrival, v_occ.total_amount, now(), now()
  )
  ON CONFLICT (agreement_id, occurrence_date) DO NOTHING
  RETURNING id INTO v_next_id;

  IF v_next_id IS NULL THEN
    SELECT id INTO v_next_id
      FROM public.agreement_occurrences
     WHERE agreement_id = v_agreement.id
       AND occurrence_date = v_next_date
     ORDER BY sequence_index ASC NULLS LAST
     LIMIT 1;
  END IF;

  RETURN v_next_id;
END;
$$;
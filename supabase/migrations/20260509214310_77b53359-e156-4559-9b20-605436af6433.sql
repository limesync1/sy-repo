
CREATE OR REPLACE FUNCTION public.materialize_occurrences_to_routes(_business_id uuid, _from date, _to date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_authorized boolean;
  v_occ RECORD;
  v_route_id uuid;
  v_seq int;
  v_inserted int := 0;
  v_planned_arrival timestamptz;
BEGIN
  SELECT (public.is_business_owner(_business_id, auth.uid()) OR public.has_role(auth.uid(),'admin'))
    INTO v_authorized;
  IF NOT v_authorized THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  FOR v_occ IN
    SELECT
      o.id, o.agreement_id, o.business_id, o.occurrence_date, o.planned_arrival,
      o.employee_ids,
      a.default_route_template_id, a.address, a.zip_code, a.city, a.latitude, a.longitude,
      a.customer_name, a.company_name, a.customer_phone, a.preferred_time_start,
      a.preferred_time_end, a.estimated_duration_minutes, a.notes,
      t.name AS tpl_name, t.color AS tpl_color, t.planned_start_time AS tpl_time,
      t.default_employee_id AS tpl_employee, t.start_address AS tpl_start_address,
      t.start_latitude AS tpl_start_lat, t.start_longitude AS tpl_start_lng,
      t.start_from_home AS tpl_start_from_home
    FROM public.agreement_occurrences o
    JOIN public.agreements a ON a.id = o.agreement_id
    LEFT JOIN public.route_templates t ON t.id = a.default_route_template_id
    WHERE o.business_id = _business_id
      AND o.occurrence_date BETWEEN _from AND _to
      AND o.route_id IS NULL
      AND o.status = 'planned'
      AND a.default_route_template_id IS NOT NULL
    ORDER BY o.occurrence_date, o.sequence_index
  LOOP
    -- Find existing route for this template on that date, else create one
    SELECT id INTO v_route_id
    FROM public.routes
    WHERE business_id = _business_id
      AND route_date = v_occ.occurrence_date
      AND route_template_id = v_occ.default_route_template_id
    LIMIT 1;

    IF v_route_id IS NULL THEN
      INSERT INTO public.routes (
        business_id, route_date, status, name, color, planned_start_time,
        start_address, start_latitude, start_longitude, start_from_home,
        route_template_id, employee_id
      )
      VALUES (
        _business_id, v_occ.occurrence_date, 'planned',
        COALESCE(v_occ.tpl_name, 'Rute'),
        COALESCE(v_occ.tpl_color, '#14b8a6'),
        COALESCE(v_occ.tpl_time, '08:00'::time),
        v_occ.tpl_start_address, v_occ.tpl_start_lat, v_occ.tpl_start_lng,
        COALESCE(v_occ.tpl_start_from_home, false),
        v_occ.default_route_template_id,
        v_occ.tpl_employee
      )
      RETURNING id INTO v_route_id;

      -- Link template's default employee onto the route
      IF v_occ.tpl_employee IS NOT NULL THEN
        INSERT INTO public.route_employees (route_id, employee_id)
        VALUES (v_route_id, v_occ.tpl_employee)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;

    -- Compute next sequence
    SELECT COALESCE(MAX(sequence), -1) + 1 INTO v_seq
    FROM public.route_stops WHERE route_id = v_route_id;

    v_planned_arrival := v_occ.planned_arrival;
    IF v_planned_arrival IS NULL AND v_occ.preferred_time_start IS NOT NULL THEN
      v_planned_arrival := ((v_occ.occurrence_date::timestamp + v_occ.preferred_time_start)
                            AT TIME ZONE 'Europe/Copenhagen');
    END IF;

    INSERT INTO public.route_stops (
      route_id, agreement_occurrence_id, sequence, status,
      customer_name, customer_phone, address, latitude, longitude,
      service_summary, notes, planned_arrival,
      duration_minutes, time_window_start, time_window_end,
      assigned_employee_id
    )
    VALUES (
      v_route_id, v_occ.id, v_seq, 'planned',
      COALESCE(v_occ.company_name, v_occ.customer_name),
      v_occ.customer_phone,
      v_occ.address, v_occ.latitude, v_occ.longitude,
      NULL, v_occ.notes, v_planned_arrival,
      COALESCE(v_occ.estimated_duration_minutes, 30),
      v_occ.preferred_time_start, v_occ.preferred_time_end,
      v_occ.tpl_employee
    );

    UPDATE public.agreement_occurrences
       SET route_id = v_route_id
     WHERE id = v_occ.id;

    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.materialize_occurrences_to_routes(uuid, date, date) TO authenticated;

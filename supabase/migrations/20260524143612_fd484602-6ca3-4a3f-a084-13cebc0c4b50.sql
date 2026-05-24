-- Remove stale projected/materialized routes that have no active stops left.
-- These are ghost routes: they either have no route_stops, or only completed/cancelled stops
-- and should not appear as future projected routes in the planner.
WITH ghost_routes AS (
  SELECT r.id, r.base_route_id, r.route_date
  FROM public.routes r
  WHERE r.base_route_id IS NOT NULL
    AND r.route_date >= CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1
      FROM public.route_stops rs
      LEFT JOIN public.agreement_occurrences ao ON ao.id = rs.agreement_occurrence_id
      WHERE rs.route_id = r.id
        AND COALESCE(ao.status::text, rs.status::text, 'planned') NOT IN ('completed', 'cancelled')
    )
), deleted_exceptions AS (
  DELETE FROM public.route_occurrence_exceptions e
  USING ghost_routes g
  WHERE e.replacement_route_id = g.id
     OR (e.base_route_id = g.base_route_id AND e.occurrence_date = g.route_date)
  RETURNING e.id
)
DELETE FROM public.routes r
USING ghost_routes g
WHERE r.id = g.id;

-- Calendar RPC: keep normal manually-created empty routes visible, but hide projected/materialized
-- recurring ghost routes that do not have any active stops.
CREATE OR REPLACE FUNCTION public.get_route_calendar(
  p_business_id uuid,
  p_from date,
  p_to date
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH
  candidate_routes AS (
    SELECT *
    FROM public.routes
    WHERE business_id = p_business_id
      AND route_date >= p_from
      AND route_date <= p_to
  ),
  routes_in_range AS (
    SELECT r.*
    FROM candidate_routes r
    WHERE r.base_route_id IS NULL
       OR EXISTS (
         SELECT 1
         FROM public.route_stops rs
         LEFT JOIN public.agreement_occurrences ao ON ao.id = rs.agreement_occurrence_id
         WHERE rs.route_id = r.id
           AND COALESCE(ao.status::text, rs.status::text, 'planned') NOT IN ('completed', 'cancelled')
       )
  ),
  stops_in_range AS (
    SELECT s.*
    FROM public.route_stops s
    JOIN routes_in_range r ON r.id = s.route_id
  ),
  stops_with_extras AS (
    SELECT
      s.*,
      COALESCE(
        (SELECT array_agg(a.employee_id ORDER BY a.is_lead DESC, a.created_at)
         FROM public.route_stop_assignees a
         WHERE a.stop_id = s.id),
        ARRAY[]::uuid[]
      ) AS assignee_ids,
      (SELECT a.employee_id
         FROM public.route_stop_assignees a
        WHERE a.stop_id = s.id AND a.is_lead = true
        LIMIT 1) AS lead_employee_id,
      ao.status::text AS occurrence_status,
      ao.occurrence_date AS occurrence_date,
      COALESCE(a.id, sub_agr.id) AS agreement_id,
      COALESCE(
        a.interval::text,
        sub_agr.interval::text,
        sub.interval,
        (SELECT (oi.details->>'interval')
           FROM public.order_items oi
          WHERE oi.order_id = s.order_id
            AND oi.details ? 'interval'
          LIMIT 1)
      ) AS agreement_interval,
      COALESCE(o.adjusted_amount, o.total_amount, 0)::numeric AS order_amount,
      o.status::text AS order_status,
      o.payment_status::text AS order_payment_status,
      o.invoice_status::text AS order_invoice_status
    FROM stops_in_range s
    LEFT JOIN public.agreement_occurrences ao ON ao.id = s.agreement_occurrence_id
    LEFT JOIN public.agreements a ON a.id = ao.agreement_id
    LEFT JOIN public.subscriptions sub ON sub.id = s.subscription_id
    LEFT JOIN public.agreements sub_agr ON sub_agr.legacy_subscription_id = s.subscription_id
    LEFT JOIN public.orders o ON o.id = s.order_id
  ),
  unassigned AS (
    SELECT o.*
    FROM public.orders o
    WHERE o.business_id = p_business_id
      AND o.status IN ('pending', 'confirmed', 'in_progress')
      AND NOT EXISTS (
        SELECT 1 FROM public.route_stops rs WHERE rs.order_id = o.id
      )
  )
  SELECT jsonb_build_object(
    'routes', COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.route_date, r.created_at) FROM routes_in_range r), '[]'::jsonb),
    'stops',  COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.route_id, s.sequence) FROM stops_with_extras s), '[]'::jsonb),
    'unassigned_jobs', COALESCE((SELECT jsonb_agg(to_jsonb(u)) FROM unassigned u), '[]'::jsonb)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_route_calendar(uuid, date, date) TO authenticated;

-- Materialization RPC: if an old empty materialization exists, remove it and rebuild it.
-- If nothing can be materialized for the projected day, fail clearly instead of returning
-- a route card with 0 stops.
CREATE OR REPLACE FUNCTION public.materialize_virtual_route(_base_route_id uuid, _date date)
RETURNS routes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_base public.routes;
  v_existing public.routes;
  v_new public.routes;
  v_agreement RECORD;
  v_occ_id uuid;
  v_idx int;
  v_planned_arrival timestamptz;
  v_next_seq int;
  v_active_stop_count int := 0;
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
    SELECT count(*)::int INTO v_active_stop_count
    FROM public.route_stops rs
    LEFT JOIN public.agreement_occurrences ao ON ao.id = rs.agreement_occurrence_id
    WHERE rs.route_id = v_existing.id
      AND COALESCE(ao.status::text, rs.status::text, 'planned') NOT IN ('completed', 'cancelled');

    IF v_active_stop_count = 0 THEN
      DELETE FROM public.route_occurrence_exceptions e
      WHERE e.replacement_route_id = v_existing.id
         OR (e.base_route_id = _base_route_id AND e.occurrence_date = _date);
      DELETE FROM public.routes WHERE id = v_existing.id;
      v_existing := NULL;
    END IF;
  END IF;

  IF v_existing.id IS NULL THEN
    INSERT INTO public.routes (
      business_id, route_date, status, name, color, start_address,
      start_latitude, start_longitude, planned_start_time, start_from_home,
      notes, base_route_id, route_template_id, employee_id
    ) VALUES (
      v_base.business_id, _date, 'planned', v_base.name, v_base.color, v_base.start_address,
      v_base.start_latitude, v_base.start_longitude, v_base.planned_start_time, COALESCE(v_base.start_from_home, false),
      v_base.notes, _base_route_id, v_base.route_template_id, v_base.employee_id
    )
    ON CONFLICT (base_route_id, route_date) DO NOTHING
    RETURNING * INTO v_new;

    IF v_new.id IS NULL THEN
      SELECT * INTO v_new
      FROM public.routes
      WHERE base_route_id = _base_route_id AND route_date = _date
      LIMIT 1;
    END IF;

    INSERT INTO public.route_employees (route_id, employee_id)
    SELECT v_new.id, re.employee_id
      FROM public.route_employees re
     WHERE re.route_id = _base_route_id
    ON CONFLICT DO NOTHING;

    IF v_base.employee_id IS NOT NULL THEN
      INSERT INTO public.route_employees (route_id, employee_id)
      VALUES (v_new.id, v_base.employee_id)
      ON CONFLICT DO NOTHING;
    END IF;
  ELSE
    v_new := v_existing;
  END IF;

  FOR v_agreement IN
    SELECT a.*
      FROM public.agreements a
     WHERE a.business_id = v_base.business_id
       AND a.status = 'active'
       AND a.interval <> 'engangskøb'
       AND a.preferred_route_id = _base_route_id
       AND a.start_date <= _date
       AND (a.end_date IS NULL OR a.end_date >= _date)
       AND public._agreement_occurs_on_route_date(a.interval, a.interval_days, v_base.route_date, _date)
  LOOP
    SELECT COALESCE(MAX(sequence_index), -1) + 1
      INTO v_idx
      FROM public.agreement_occurrences
     WHERE agreement_id = v_agreement.id;

    IF v_agreement.preferred_time_start IS NOT NULL THEN
      v_planned_arrival := ((_date::timestamp + v_agreement.preferred_time_start) AT TIME ZONE 'Europe/Copenhagen');
    ELSE
      v_planned_arrival := NULL;
    END IF;

    INSERT INTO public.agreement_occurrences (
      agreement_id, business_id, occurrence_date, sequence_index, status,
      route_id, employee_ids, planned_arrival
    ) VALUES (
      v_agreement.id, v_agreement.business_id, _date, v_idx, 'planned',
      v_new.id, COALESCE(v_agreement.employee_ids, '{}'::uuid[]), v_planned_arrival
    )
    ON CONFLICT (agreement_id, occurrence_date) DO UPDATE
      SET route_id = COALESCE(public.agreement_occurrences.route_id, EXCLUDED.route_id),
          planned_arrival = COALESCE(public.agreement_occurrences.planned_arrival, EXCLUDED.planned_arrival),
          employee_ids = CASE
            WHEN COALESCE(array_length(public.agreement_occurrences.employee_ids, 1), 0) = 0 THEN EXCLUDED.employee_ids
            ELSE public.agreement_occurrences.employee_ids
          END,
          updated_at = now()
    RETURNING id INTO v_occ_id;

    PERFORM public._materialize_occurrence_on_route(v_occ_id, v_new.id);
  END LOOP;

  SELECT COALESCE(MAX(sequence), -1) + 1 INTO v_next_seq
    FROM public.route_stops WHERE route_id = v_new.id;

  INSERT INTO public.route_stops (
    route_id, sequence, status, planned_arrival,
    address, latitude, longitude, customer_name, customer_phone, service_summary,
    duration_minutes, time_window_start, time_window_end, assigned_employee_id,
    required_staff, notes, order_id, subscription_id
  )
  SELECT
    v_new.id,
    v_next_seq + (row_number() OVER (ORDER BY rs.sequence, rs.created_at) - 1)::int,
    'planned',
    CASE
      WHEN rs.planned_arrival IS NOT NULL THEN ((_date::timestamp + rs.planned_arrival::time) AT TIME ZONE 'Europe/Copenhagen')
      ELSE NULL
    END,
    rs.address, rs.latitude, rs.longitude, rs.customer_name, rs.customer_phone,
    rs.service_summary, rs.duration_minutes,
    rs.time_window_start, rs.time_window_end, rs.assigned_employee_id,
    COALESCE(rs.required_staff, 1), rs.notes, rs.order_id, rs.subscription_id
  FROM public.route_stops rs
  WHERE rs.route_id = _base_route_id
    AND rs.agreement_occurrence_id IS NULL
    AND COALESCE(rs.status::text, 'planned') NOT IN ('completed', 'cancelled')
    AND projectedStopMatchesSources IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.route_stops x
       WHERE x.route_id = v_new.id
         AND x.order_id IS NOT DISTINCT FROM rs.order_id
         AND x.subscription_id IS NOT DISTINCT FROM rs.subscription_id
         AND x.address IS NOT DISTINCT FROM rs.address
    );

  INSERT INTO public.route_stop_assignees (stop_id, employee_id, is_lead)
  SELECT new_rs.id, rsa.employee_id, rsa.is_lead
    FROM public.route_stops new_rs
    JOIN public.route_stops base_rs
      ON base_rs.route_id = _base_route_id
     AND base_rs.address IS NOT DISTINCT FROM new_rs.address
     AND base_rs.order_id IS NOT DISTINCT FROM new_rs.order_id
     AND base_rs.subscription_id IS NOT DISTINCT FROM new_rs.subscription_id
    JOIN public.route_stop_assignees rsa ON rsa.stop_id = base_rs.id
   WHERE new_rs.route_id = v_new.id
     AND new_rs.agreement_occurrence_id IS NULL
  ON CONFLICT DO NOTHING;

  SELECT count(*)::int INTO v_active_stop_count
  FROM public.route_stops rs
  LEFT JOIN public.agreement_occurrences ao ON ao.id = rs.agreement_occurrence_id
  WHERE rs.route_id = v_new.id
    AND COALESCE(ao.status::text, rs.status::text, 'planned') NOT IN ('completed', 'cancelled');

  IF v_active_stop_count = 0 THEN
    DELETE FROM public.routes WHERE id = v_new.id;
    RAISE EXCEPTION 'Den projicerede rute har ingen aktive stops og er derfor fjernet.';
  END IF;

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
$$;

GRANT EXECUTE ON FUNCTION public.materialize_virtual_route(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.materialize_virtual_route(uuid, date) TO service_role;
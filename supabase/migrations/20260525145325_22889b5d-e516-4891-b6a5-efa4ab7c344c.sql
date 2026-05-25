
-- ─────────────────────────────────────────────────────────────────────────
-- Fix: scope='single' on a BASE route used to UPDATE routes.route_date,
-- which re-anchored ALL future projected occurrences. Now we instead
-- clone the route onto the new date and add a 'moved' exception, so
-- the base route (and therefore the projection cadence) is untouched.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.move_route_to_date(
  _route_id uuid,
  _new_date date,
  _scope text DEFAULT 'single'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_route public.routes%ROWTYPE;
  v_from_date date;
  v_delta_days int;
  v_base_route_id uuid;
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_is_owner boolean;
  v_new public.routes%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_route FROM public.routes WHERE id = _route_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Route not found';
  END IF;

  SELECT public.has_role(v_uid, 'admin'::app_role) INTO v_is_admin;
  SELECT public.is_route_owner(_route_id, v_uid) INTO v_is_owner;
  IF NOT (COALESCE(v_is_admin, false) OR COALESCE(v_is_owner, false)) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_from_date := v_route.route_date;
  IF v_from_date = _new_date THEN
    RETURN jsonb_build_object('ok', true, 'changed', false);
  END IF;
  v_delta_days := (_new_date - v_from_date);
  v_base_route_id := COALESCE(v_route.base_route_id, v_route.id);

  -- Hard guard: do not allow moving onto a date that already has a route
  -- from the same series (base or other override).
  IF EXISTS (
    SELECT 1 FROM public.routes r
    WHERE r.id <> _route_id
      AND r.route_date = _new_date
      AND (r.id = v_base_route_id OR r.base_route_id = v_base_route_id)
  ) THEN
    RAISE EXCEPTION 'Der findes allerede en rute fra samme serie på %', _new_date;
  END IF;

  -- ── BASE route + scope=single → clone to new date (do not move base) ──
  IF _scope = 'single' AND v_route.base_route_id IS NULL THEN
    INSERT INTO public.routes (
      business_id, route_date, name, color, start_address,
      start_latitude, start_longitude, planned_start_time, start_from_home,
      notes, base_route_id, employee_id
    ) VALUES (
      v_route.business_id, _new_date, v_route.name, v_route.color, v_route.start_address,
      v_route.start_latitude, v_route.start_longitude, v_route.planned_start_time,
      COALESCE(v_route.start_from_home, false),
      v_route.notes, v_route.id, v_route.employee_id
    )
    ON CONFLICT (base_route_id, route_date) DO NOTHING
    RETURNING * INTO v_new;

    IF v_new.id IS NULL THEN
      SELECT * INTO v_new FROM public.routes
        WHERE base_route_id = v_route.id AND route_date = _new_date
        LIMIT 1;
    END IF;

    -- Clone stops + assignees with day-shifted planned times
    WITH base_stops AS (
      SELECT id, sequence, address, latitude, longitude, customer_name, customer_phone,
             service_summary, duration_minutes, time_window_start, time_window_end,
             assigned_employee_id, required_staff, notes,
             planned_arrival, planned_departure
      FROM public.route_stops
      WHERE route_id = v_route.id
      ORDER BY sequence ASC
    ),
    inserted AS (
      INSERT INTO public.route_stops (
        route_id, sequence, status, address, latitude, longitude,
        customer_name, customer_phone, service_summary, duration_minutes,
        time_window_start, time_window_end, assigned_employee_id, required_staff, notes,
        planned_arrival, planned_departure
      )
      SELECT v_new.id, COALESCE(sequence, 0), 'pending', address, latitude, longitude,
             customer_name, customer_phone, service_summary, COALESCE(duration_minutes, 30),
             time_window_start, time_window_end, assigned_employee_id, COALESCE(required_staff, 1), notes,
             CASE WHEN planned_arrival IS NOT NULL THEN planned_arrival + make_interval(days => v_delta_days) END,
             CASE WHEN planned_departure IS NOT NULL THEN planned_departure + make_interval(days => v_delta_days) END
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

    INSERT INTO public.route_employees (route_id, employee_id)
    SELECT v_new.id, employee_id
    FROM public.route_employees
    WHERE route_id = v_route.id
    ON CONFLICT DO NOTHING;

    INSERT INTO public.route_occurrence_exceptions
      (business_id, base_route_id, occurrence_date, replacement_route_id, exception_type)
    VALUES
      (v_route.business_id, v_route.id, v_from_date, v_new.id, 'moved')
    ON CONFLICT (base_route_id, occurrence_date) DO UPDATE SET
      replacement_route_id = EXCLUDED.replacement_route_id,
      exception_type = EXCLUDED.exception_type;

    RETURN jsonb_build_object(
      'ok', true, 'changed', true,
      'from_date', v_from_date, 'new_date', _new_date,
      'delta_days', v_delta_days, 'new_route_id', v_new.id,
      'materialized', true
    );
  END IF;

  -- ── Non-base route OR scope=future → shift the row itself (legacy) ──
  UPDATE public.routes SET route_date = _new_date WHERE id = _route_id;

  UPDATE public.agreement_occurrences
    SET occurrence_date = _new_date
    WHERE route_id = _route_id;

  IF v_delta_days <> 0 THEN
    UPDATE public.route_stops
      SET planned_arrival = planned_arrival + make_interval(days => v_delta_days),
          planned_departure = planned_departure + make_interval(days => v_delta_days)
      WHERE route_id = _route_id;
  END IF;

  INSERT INTO public.route_occurrence_exceptions
    (business_id, base_route_id, occurrence_date, replacement_route_id, exception_type)
  VALUES
    (v_route.business_id, v_base_route_id, v_from_date, _route_id, 'moved')
  ON CONFLICT (base_route_id, occurrence_date)
    DO UPDATE SET
      replacement_route_id = EXCLUDED.replacement_route_id,
      exception_type = EXCLUDED.exception_type;

  IF _scope = 'future' AND v_delta_days <> 0 THEN
    UPDATE public.subscriptions s
      SET next_service_date = s.next_service_date + make_interval(days => v_delta_days)
      WHERE s.status = 'active'
        AND s.interval IS NOT NULL
        AND s.interval <> 'engangskøb'
        AND s.next_service_date IS NOT NULL
        AND (
          s.preferred_route_id = _route_id
          OR s.id IN (
            SELECT subscription_id FROM public.route_stops
              WHERE route_id = _route_id AND subscription_id IS NOT NULL
          )
        );

    UPDATE public.agreements a
      SET start_date = a.start_date + v_delta_days
      WHERE a.preferred_route_id = _route_id
        AND a.status = 'active'
        AND a.interval IS NOT NULL
        AND a.interval <> 'engangskøb'
        AND a.start_date IS NOT NULL;
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'changed', true,
    'from_date', v_from_date, 'new_date', _new_date,
    'delta_days', v_delta_days
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.move_route_to_date(uuid, date, text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- New: move a single PROJECTED (virtual) occurrence to a different date.
-- Clones the base route to _to_date and marks _from_date as moved.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.move_projected_occurrence(
  _base_route_id uuid,
  _from_date date,
  _to_date date
)
RETURNS public.routes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_base public.routes%ROWTYPE;
  v_existing public.routes%ROWTYPE;
  v_new public.routes%ROWTYPE;
  v_delta int;
  v_is_admin boolean;
  v_is_owner boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_base FROM public.routes WHERE id = _base_route_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Basisrute findes ikke'; END IF;

  SELECT public.has_role(v_uid, 'admin'::app_role) INTO v_is_admin;
  SELECT public.is_route_owner(_base_route_id, v_uid) INTO v_is_owner;
  IF NOT (COALESCE(v_is_admin, false) OR COALESCE(v_is_owner, false)) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF _from_date = _to_date THEN
    RAISE EXCEPTION 'Den nye dato er den samme som den nuværende';
  END IF;

  v_delta := (_to_date - _from_date);

  -- Forbid collisions: target date already has a route in same series
  IF EXISTS (
    SELECT 1 FROM public.routes r
    WHERE r.route_date = _to_date
      AND (r.id = _base_route_id OR r.base_route_id = _base_route_id)
  ) THEN
    RAISE EXCEPTION 'Der findes allerede en rute fra samme serie på %', _to_date;
  END IF;

  -- Clone base → new override on _to_date
  INSERT INTO public.routes (
    business_id, route_date, name, color, start_address,
    start_latitude, start_longitude, planned_start_time, start_from_home,
    notes, base_route_id, employee_id
  ) VALUES (
    v_base.business_id, _to_date, v_base.name, v_base.color, v_base.start_address,
    v_base.start_latitude, v_base.start_longitude, v_base.planned_start_time,
    COALESCE(v_base.start_from_home, false),
    v_base.notes, _base_route_id, v_base.employee_id
  )
  ON CONFLICT (base_route_id, route_date) DO NOTHING
  RETURNING * INTO v_new;

  IF v_new.id IS NULL THEN
    SELECT * INTO v_new FROM public.routes
      WHERE base_route_id = _base_route_id AND route_date = _to_date
      LIMIT 1;
  END IF;

  -- Clone stops + assignees, shifting planned times by delta from base
  WITH base_stops AS (
    SELECT id, sequence, address, latitude, longitude, customer_name, customer_phone,
           service_summary, duration_minutes, time_window_start, time_window_end,
           assigned_employee_id, required_staff, notes,
           planned_arrival, planned_departure
    FROM public.route_stops
    WHERE route_id = _base_route_id
    ORDER BY sequence ASC
  ),
  inserted AS (
    INSERT INTO public.route_stops (
      route_id, sequence, status, address, latitude, longitude,
      customer_name, customer_phone, service_summary, duration_minutes,
      time_window_start, time_window_end, assigned_employee_id, required_staff, notes,
      planned_arrival, planned_departure
    )
    SELECT v_new.id, COALESCE(sequence, 0), 'pending', address, latitude, longitude,
           customer_name, customer_phone, service_summary, COALESCE(duration_minutes, 30),
           time_window_start, time_window_end, assigned_employee_id, COALESCE(required_staff, 1), notes,
           NULL, NULL
    FROM base_stops
    WHERE NOT EXISTS (
      SELECT 1 FROM public.route_stops rs WHERE rs.route_id = v_new.id
    )
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

  INSERT INTO public.route_employees (route_id, employee_id)
  SELECT v_new.id, employee_id
  FROM public.route_employees
  WHERE route_id = _base_route_id
  ON CONFLICT DO NOTHING;

  -- Mark the original projected date as moved → suppress projection there
  INSERT INTO public.route_occurrence_exceptions
    (business_id, base_route_id, occurrence_date, replacement_route_id, exception_type)
  VALUES
    (v_base.business_id, _base_route_id, _from_date, v_new.id, 'moved')
  ON CONFLICT (base_route_id, occurrence_date) DO UPDATE SET
    replacement_route_id = EXCLUDED.replacement_route_id,
    exception_type = EXCLUDED.exception_type;

  RETURN v_new;
END;
$$;

GRANT EXECUTE ON FUNCTION public.move_projected_occurrence(uuid, date, date) TO authenticated;

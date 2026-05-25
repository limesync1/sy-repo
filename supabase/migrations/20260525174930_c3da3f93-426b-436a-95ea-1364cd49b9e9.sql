-- 1) Replace move_route_to_date with idempotent stop cloning
CREATE OR REPLACE FUNCTION public.move_route_to_date(_route_id uuid, _new_date date, _scope text DEFAULT 'single'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_route public.routes%ROWTYPE;
  v_from_date date;
  v_delta_days int;
  v_base_route_id uuid;
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_is_owner boolean;
  v_new public.routes%ROWTYPE;
  v_new_has_stops boolean;
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

  IF EXISTS (
    SELECT 1 FROM public.routes r
    WHERE r.id <> _route_id
      AND r.route_date = _new_date
      AND (r.id = v_base_route_id OR r.base_route_id = v_base_route_id)
  ) THEN
    -- Allowed for single+base path (we expect a possible existing clone there);
    -- only block when the destination already has an OTHER series-route AND this is not the single+base clone path.
    IF NOT (_scope = 'single' AND v_route.base_route_id IS NULL) THEN
      RAISE EXCEPTION 'Der findes allerede en rute fra samme serie på %', _new_date;
    END IF;
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

    -- Idempotency guard: only clone stops if the destination route is empty.
    -- Without this, re-running move (double-click, retry, or move→back→move)
    -- would insert a fresh duplicate set of every base stop.
    SELECT EXISTS (SELECT 1 FROM public.route_stops WHERE route_id = v_new.id)
      INTO v_new_has_stops;

    IF NOT v_new_has_stops THEN
      WITH base_stops AS (
        SELECT id, sequence, address, latitude, longitude, customer_name, customer_phone,
               service_summary, duration_minutes, time_window_start, time_window_end,
               assigned_employee_id, required_staff, notes,
               planned_arrival, planned_departure,
               order_id, subscription_id
        FROM public.route_stops
        WHERE route_id = v_route.id
        ORDER BY sequence ASC, created_at ASC
      ),
      base_stops_numbered AS (
        SELECT *, row_number() OVER (ORDER BY sequence ASC, created_at ASC) AS rn
        FROM base_stops
      ),
      inserted AS (
        INSERT INTO public.route_stops (
          route_id, sequence, status, address, latitude, longitude,
          customer_name, customer_phone, service_summary, duration_minutes,
          time_window_start, time_window_end, assigned_employee_id, required_staff, notes,
          planned_arrival, planned_departure, order_id, subscription_id
        )
        SELECT v_new.id, COALESCE(sequence, 0), 'pending', address, latitude, longitude,
               customer_name, customer_phone, service_summary, COALESCE(duration_minutes, 30),
               time_window_start, time_window_end, assigned_employee_id, COALESCE(required_staff, 1), notes,
               CASE WHEN planned_arrival IS NOT NULL THEN planned_arrival + make_interval(days => v_delta_days) END,
               CASE WHEN planned_departure IS NOT NULL THEN planned_departure + make_interval(days => v_delta_days) END,
               order_id, subscription_id
        FROM base_stops_numbered
        RETURNING id
      ),
      inserted_numbered AS (
        SELECT id AS new_id, row_number() OVER (ORDER BY id) AS rn
        FROM inserted
      ),
      id_map AS (
        -- Robust 1:1 mapping by row index (NOT by sequence, which can collide
        -- when multiple stops share the same sequence number after a merge).
        SELECT b.id AS old_id, i.new_id
        FROM base_stops_numbered b
        JOIN inserted_numbered i ON i.rn = b.rn
      )
      INSERT INTO public.route_stop_assignees (stop_id, employee_id)
      SELECT m.new_id, a.employee_id
      FROM public.route_stop_assignees a
      JOIN id_map m ON m.old_id = a.stop_id
      ON CONFLICT DO NOTHING;
    END IF;

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
      'materialized', true,
      'reused_existing', v_new_has_stops
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
        AND (s.preferred_route_id = _route_id OR s.preferred_route_id = v_base_route_id);
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'changed', true,
    'from_date', v_from_date, 'new_date', _new_date,
    'delta_days', v_delta_days
  );
END;
$function$;

-- 2) Clean up the existing duplicate stops on route 71f58d87 (Ole Henriksen)
-- Keep the earliest stop per (route_id, order_id, subscription_id, address) tuple,
-- delete the rest. Limit scope strictly to the affected route to avoid surprises.
WITH dups AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY route_id,
                        COALESCE(order_id::text, ''),
                        COALESCE(subscription_id::text, ''),
                        COALESCE(agreement_occurrence_id::text, ''),
                        COALESCE(address, '')
           ORDER BY created_at ASC, sequence ASC, id ASC
         ) AS rn
  FROM public.route_stops
  WHERE route_id = '71f58d87-d616-459e-8447-2aa3e850f37f'
)
DELETE FROM public.route_stops
WHERE id IN (SELECT id FROM dups WHERE rn > 1);

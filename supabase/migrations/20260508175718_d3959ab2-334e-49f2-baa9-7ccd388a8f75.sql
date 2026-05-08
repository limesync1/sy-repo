
-- Helper: find or create a route for (business, employee, date), copying color from the source route when creating.
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
  v_start_addr text;
  v_start_lat numeric;
  v_start_lng numeric;
  v_planned_start time;
BEGIN
  -- Try to reuse an existing route on that exact date for this employee
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

  -- Otherwise reuse any route on that date for the business (fallback)
  SELECT r.id INTO v_route_id
    FROM public.routes r
   WHERE r.business_id = _business_id
     AND r.route_date = _route_date
   ORDER BY r.created_at ASC
   LIMIT 1;
  IF v_route_id IS NOT NULL THEN RETURN v_route_id; END IF;

  -- Read source-route metadata to copy
  IF _source_route_id IS NOT NULL THEN
    SELECT color, start_address, start_latitude, start_longitude, planned_start_time
      INTO v_color, v_start_addr, v_start_lat, v_start_lng, v_planned_start
      FROM public.routes WHERE id = _source_route_id;
  END IF;

  IF v_color IS NULL THEN v_color := '#14b8a6'; END IF;
  IF v_planned_start IS NULL THEN v_planned_start := '08:00:00'::time; END IF;

  INSERT INTO public.routes (
    business_id, employee_id, route_date, status, name, color,
    start_address, start_latitude, start_longitude, planned_start_time
  ) VALUES (
    _business_id, _employee_id, _route_date, 'planned',
    NULL, v_color,
    v_start_addr, v_start_lat, v_start_lng, v_planned_start
  ) RETURNING id INTO v_route_id;

  IF _employee_id IS NOT NULL THEN
    INSERT INTO public.route_employees (route_id, employee_id, is_lead)
    VALUES (v_route_id, _employee_id, true)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_route_id;
END;
$function$;

-- Replace completion trigger so that recurring appointments immediately create
-- the next order + route stop on the future date with the same employee.
CREATE OR REPLACE FUNCTION public.handle_route_stop_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_order_id uuid;
  v_old_order RECORD;
  v_accounting_active boolean;
  v_interval text;
  v_next_at timestamptz;
  v_route_id uuid;
  v_employee_id uuid;
  v_root uuid;
  v_cycle int;
  v_new_order_id uuid;
  v_next_route_id uuid;
  v_sequence int;
  v_due_date date;
BEGIN
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN RETURN NEW; END IF;

  v_order_id := NEW.order_id;
  IF v_order_id IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO v_old_order FROM public.orders WHERE id = v_order_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  v_route_id := NEW.route_id;
  v_employee_id := NEW.assigned_employee_id;

  SELECT (oi.details->>'interval') INTO v_interval
    FROM public.order_items oi
   WHERE oi.order_id = v_order_id
     AND (oi.details->>'interval') IS NOT NULL
     AND (oi.details->>'interval') <> 'engangskøb'
   LIMIT 1;

  IF v_interval IS NOT NULL THEN
    v_next_at := COALESCE(NEW.completed_at, now()) + public.interval_to_duration(v_interval);
  END IF;

  UPDATE public.orders
     SET status = 'completed',
         completed_cycles = COALESCE(completed_cycles, 0) + 1,
         next_service_date = CASE WHEN v_interval IS NOT NULL THEN v_next_at ELSE next_service_date END,
         updated_at = now()
   WHERE id = v_order_id;

  SELECT EXISTS (
    SELECT 1 FROM public.accounting_integrations ai
     WHERE ai.business_id = v_old_order.business_id AND ai.is_active = true
  ) INTO v_accounting_active;

  IF v_accounting_active THEN
    INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation)
    VALUES (v_old_order.business_id, 'invoice', v_order_id, 'book')
    ON CONFLICT DO NOTHING;
    PERFORM public.kick_accounting_sync(v_old_order.business_id);
  END IF;

  IF v_interval IS NOT NULL THEN
    -- Ensure exactly one active subscription per (order_id, service_id)
    INSERT INTO public.subscriptions (
      business_id, customer_id, service_id, order_id,
      service_name, interval, status, details, total_price, next_service_date,
      preferred_route_id
    )
    SELECT v_old_order.business_id, v_old_order.customer_id, oi.service_id, v_order_id,
           oi.service_name, oi.details->>'interval', 'active', oi.details, oi.total_price, v_next_at,
           v_route_id
      FROM public.order_items oi
     WHERE oi.order_id = v_order_id
       AND oi.details->>'interval' IS NOT NULL
       AND oi.details->>'interval' <> 'engangskøb'
       AND NOT EXISTS (
         SELECT 1 FROM public.subscriptions s
         WHERE s.order_id = v_order_id
           AND COALESCE(s.service_id::text,'') = COALESCE(oi.service_id::text,'')
       );

    UPDATE public.subscriptions
       SET next_service_date = v_next_at,
           preferred_route_id = COALESCE(preferred_route_id, v_route_id),
           updated_at = now()
     WHERE order_id = v_order_id AND status = 'active';

    -- Immediately create the NEXT cycle order + future route stop
    v_root := COALESCE(v_old_order.parent_order_id, v_old_order.id);
    v_cycle := COALESCE(v_old_order.recurrence_cycle, 0) + 1;
    v_due_date := (v_next_at AT TIME ZONE 'Europe/Copenhagen')::date;

    -- Skip if a non-cancelled order already exists for this cycle (idempotent)
    IF NOT EXISTS (
      SELECT 1 FROM public.orders o
       WHERE o.parent_order_id = v_root
         AND o.recurrence_cycle = v_cycle
         AND o.status <> 'cancelled'
    ) THEN
      INSERT INTO public.orders (
        business_id, customer_id, customer_name, customer_email, customer_phone,
        company_name, cvr, address, zip_code, city, latitude, longitude,
        total_amount, status, notes, payment_terms_days,
        preferred_date, preferred_time_start, preferred_time_end,
        estimated_duration_minutes, parent_order_id, recurrence_cycle,
        next_service_date
      ) VALUES (
        v_old_order.business_id, v_old_order.customer_id, v_old_order.customer_name,
        v_old_order.customer_email, v_old_order.customer_phone,
        v_old_order.company_name, v_old_order.cvr, v_old_order.address,
        v_old_order.zip_code, v_old_order.city, v_old_order.latitude, v_old_order.longitude,
        v_old_order.total_amount, 'confirmed', v_old_order.notes, v_old_order.payment_terms_days,
        v_due_date,
        COALESCE(v_old_order.preferred_time_start, NEW.time_window_start),
        COALESCE(v_old_order.preferred_time_end,   NEW.time_window_end),
        COALESCE(v_old_order.estimated_duration_minutes, NEW.duration_minutes),
        v_root, v_cycle,
        NULL
      ) RETURNING id INTO v_new_order_id;

      INSERT INTO public.order_items (order_id, service_id, service_name, quantity, unit_price, total_price, details)
      SELECT v_new_order_id, oi.service_id, oi.service_name, oi.quantity, oi.unit_price, oi.total_price, oi.details
        FROM public.order_items oi WHERE oi.order_id = v_old_order.id;

      -- Find or create a route on the next service date with the same employee
      v_next_route_id := public.find_or_create_route_for_employee(
        v_old_order.business_id, v_employee_id, v_due_date, v_route_id
      );

      IF v_next_route_id IS NOT NULL THEN
        SELECT COALESCE(MAX(sequence), 0) + 1 INTO v_sequence
          FROM public.route_stops WHERE route_id = v_next_route_id;

        INSERT INTO public.route_stops (
          route_id, order_id, subscription_id, sequence, planned_arrival, status,
          address, latitude, longitude, customer_name, customer_phone, service_summary,
          duration_minutes, time_window_start, time_window_end, assigned_employee_id, required_staff
        )
        SELECT
          v_next_route_id, v_new_order_id, s.id, v_sequence, v_next_at, 'pending',
          COALESCE(NEW.address, v_old_order.address),
          COALESCE(NEW.latitude, v_old_order.latitude),
          COALESCE(NEW.longitude, v_old_order.longitude),
          v_old_order.customer_name, v_old_order.customer_phone,
          COALESCE(NEW.service_summary, s.service_name),
          COALESCE(NEW.duration_minutes, v_old_order.estimated_duration_minutes, 30),
          NEW.time_window_start, NEW.time_window_end,
          v_employee_id,
          COALESCE(NEW.required_staff, 1)
          FROM public.subscriptions s
         WHERE s.order_id = v_order_id AND s.status = 'active'
         ORDER BY s.created_at DESC LIMIT 1;

        -- Roll subscription forward to the new order so cron does not double-book
        UPDATE public.subscriptions
           SET order_id = v_new_order_id,
               next_service_date = NULL,
               preferred_route_id = COALESCE(preferred_route_id, v_next_route_id),
               updated_at = now()
         WHERE order_id = v_order_id AND status = 'active';
      END IF;
    END IF;
  END IF;

  -- Remove the completed stop from the route (snapshot already saved by trg_snapshot_completed_stop)
  DELETE FROM public.route_stops WHERE id = NEW.id;

  RETURN NEW;
END;
$function$;

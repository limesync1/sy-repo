
CREATE OR REPLACE FUNCTION public.auto_cycle_subscription_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_interval text;
  v_next_at timestamptz;
  v_root uuid;
  v_cycle int;
  v_new_order_id uuid;
  v_new_stop_id uuid;
  v_route_exists boolean := false;
  v_assignees uuid[];
  v_sequence int;
  v_route_id uuid;
BEGIN
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN RETURN NEW; END IF;
  IF NEW.order_id IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = NEW.order_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT (oi.details->>'interval') INTO v_interval
  FROM public.order_items oi
  WHERE oi.order_id = NEW.order_id
    AND (oi.details->>'interval') IS NOT NULL
    AND (oi.details->>'interval') <> 'engangskøb'
  LIMIT 1;

  IF v_interval IS NULL THEN
    RETURN NEW;
  END IF;

  v_next_at := COALESCE(NEW.completed_at, now()) + public.interval_to_duration(v_interval);
  v_root := COALESCE(v_order.parent_order_id, v_order.id);
  v_cycle := COALESCE(v_order.recurrence_cycle, 0) + 1;

  -- Idempotent: hvis næste cyklus allerede findes, slet kun det gamle stop
  IF EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.parent_order_id = v_root
      AND o.recurrence_cycle = v_cycle
      AND o.status <> 'cancelled'
  ) THEN
    DELETE FROM public.route_stops WHERE id = NEW.id;
    RETURN NEW;
  END IF;

  INSERT INTO public.orders (
    business_id, customer_id, customer_name, customer_email, customer_phone,
    company_name, cvr, address, zip_code, city, latitude, longitude,
    total_amount, status, notes, payment_terms_days,
    preferred_date, preferred_time_start, preferred_time_end,
    estimated_duration_minutes, parent_order_id, recurrence_cycle,
    next_service_date
  ) VALUES (
    v_order.business_id, v_order.customer_id, v_order.customer_name,
    v_order.customer_email, v_order.customer_phone,
    v_order.company_name, v_order.cvr, v_order.address,
    v_order.zip_code, v_order.city, v_order.latitude, v_order.longitude,
    v_order.total_amount, 'confirmed', v_order.notes, v_order.payment_terms_days,
    (v_next_at AT TIME ZONE 'Europe/Copenhagen')::date,
    v_order.preferred_time_start, v_order.preferred_time_end,
    v_order.estimated_duration_minutes, v_root, v_cycle, NULL
  ) RETURNING id INTO v_new_order_id;

  INSERT INTO public.order_items (order_id, service_id, service_name, quantity, unit_price, total_price, details)
  SELECT v_new_order_id, oi.service_id, oi.service_name, oi.quantity, oi.unit_price, oi.total_price, oi.details
    FROM public.order_items oi WHERE oi.order_id = v_order.id;

  v_route_id := NEW.route_id;
  IF v_route_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.routes WHERE id = v_route_id) INTO v_route_exists;
  END IF;

  IF v_route_exists THEN
    SELECT array_agg(DISTINCT employee_id) INTO v_assignees
      FROM public.route_stop_assignees WHERE stop_id = NEW.id;

    SELECT COALESCE(MAX(sequence), 0) + 1 INTO v_sequence
      FROM public.route_stops WHERE route_id = v_route_id;

    INSERT INTO public.route_stops (
      route_id, order_id, sequence, planned_arrival, status,
      address, latitude, longitude, customer_name, customer_phone, service_summary,
      duration_minutes, time_window_start, time_window_end, assigned_employee_id, required_staff
    ) VALUES (
      v_route_id, v_new_order_id, v_sequence, v_next_at, 'pending',
      NEW.address, NEW.latitude, NEW.longitude,
      NEW.customer_name, NEW.customer_phone, NEW.service_summary,
      NEW.duration_minutes, NEW.time_window_start, NEW.time_window_end,
      NEW.assigned_employee_id, COALESCE(NEW.required_staff, 1)
    ) RETURNING id INTO v_new_stop_id;

    IF v_assignees IS NOT NULL AND array_length(v_assignees, 1) IS NOT NULL THEN
      INSERT INTO public.route_stop_assignees (stop_id, employee_id, is_lead)
      SELECT v_new_stop_id, e, false FROM unnest(v_assignees) AS e
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  UPDATE public.subscriptions
     SET order_id = v_new_order_id,
         next_service_date = NULL,
         preferred_route_id = COALESCE(preferred_route_id, v_route_id),
         updated_at = now()
   WHERE order_id = v_order.id AND status = 'active';

  -- Slet det gamle, udførte stop fra ruten (snapshot detaches automatisk)
  DELETE FROM public.route_stops WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zzz_auto_cycle_subscription_on_completion ON public.route_stops;
CREATE TRIGGER zzz_auto_cycle_subscription_on_completion
AFTER UPDATE ON public.route_stops
FOR EACH ROW
EXECUTE FUNCTION public.auto_cycle_subscription_on_completion();

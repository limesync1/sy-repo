CREATE OR REPLACE FUNCTION public.interval_to_duration(_interval text)
RETURNS interval
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT CASE _interval
    WHEN '10_min'      THEN interval '10 minutes'
    WHEN 'daglig'      THEN interval '1 day'
    WHEN 'ugentlig'    THEN interval '7 days'
    WHEN 'hver_14_dag' THEN interval '14 days'
    WHEN 'månedlig'    THEN interval '30 days'
    WHEN 'hver_4_uge'  THEN interval '28 days'
    WHEN 'hver_8_uge'  THEN interval '56 days'
    WHEN 'kvartalsvis' THEN interval '90 days'
    WHEN 'halvårlig'   THEN interval '180 days'
    WHEN 'årlig'       THEN interval '365 days'
    ELSE interval '30 days'
  END
$$;

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
BEGIN
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN RETURN NEW; END IF;

  v_order_id := NEW.order_id;
  IF v_order_id IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO v_old_order FROM public.orders WHERE id = v_order_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT (oi.details->>'interval') INTO v_interval
    FROM public.order_items oi
   WHERE oi.order_id = v_order_id
     AND (oi.details->>'interval') IS NOT NULL
     AND (oi.details->>'interval') <> 'engangskøb'
   LIMIT 1;

  IF v_interval IS NOT NULL THEN
    v_next_at := now() + public.interval_to_duration(v_interval);
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
    INSERT INTO public.subscriptions (
      business_id, customer_id, service_id, order_id,
      service_name, interval, status, details, total_price, next_service_date,
      preferred_route_id
    )
    SELECT v_old_order.business_id, v_old_order.customer_id, oi.service_id, v_order_id,
           oi.service_name, oi.details->>'interval', 'active', oi.details, oi.total_price, v_next_at,
           NEW.route_id
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
           preferred_route_id = COALESCE(preferred_route_id, NEW.route_id),
           updated_at = now()
     WHERE order_id = v_order_id AND status = 'active';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_recur_due_orders()
 RETURNS TABLE(created_order_id uuid, source_order_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  r record;
  v_source_order RECORD;
  v_source_stop RECORD;
  v_new_id uuid;
  v_due_at timestamptz;
  v_next_at timestamptz;
  v_root uuid;
  v_cycle int;
  v_route_id uuid;
  v_employee_id uuid;
  v_sequence int;
BEGIN
  FOR r IN
    SELECT s.*
      FROM public.subscriptions s
     WHERE s.status = 'active'
       AND s.next_service_date IS NOT NULL
       AND s.next_service_date <= now()
       AND s.interval IS NOT NULL
       AND s.interval <> 'engangskøb'
  LOOP
    SELECT * INTO v_source_order FROM public.orders WHERE id = r.order_id;
    IF NOT FOUND THEN
      UPDATE public.subscriptions SET next_service_date = now() + public.interval_to_duration(r.interval), updated_at = now() WHERE id = r.id;
      CONTINUE;
    END IF;

    IF v_source_order.status NOT IN ('completed','confirmed') THEN
      CONTINUE;
    END IF;

    v_due_at := r.next_service_date;
    v_next_at := v_due_at + public.interval_to_duration(r.interval);
    v_root := COALESCE(v_source_order.parent_order_id, v_source_order.id);
    v_cycle := COALESCE(v_source_order.recurrence_cycle, 0) + 1;

    IF EXISTS (
      SELECT 1 FROM public.orders o
       WHERE o.parent_order_id = v_root
         AND o.recurrence_cycle = v_cycle
         AND o.status <> 'cancelled'
    ) THEN
      UPDATE public.subscriptions
         SET next_service_date = v_next_at,
             updated_at = now()
       WHERE id = r.id;
      CONTINUE;
    END IF;

    INSERT INTO public.orders (
      business_id, customer_id, customer_name, customer_email, customer_phone,
      company_name, cvr, address, zip_code, city, latitude, longitude,
      total_amount, status, notes, payment_terms_days,
      preferred_date, preferred_time_start, preferred_time_end,
      estimated_duration_minutes, parent_order_id, recurrence_cycle,
      next_service_date
    ) VALUES (
      v_source_order.business_id, v_source_order.customer_id, v_source_order.customer_name,
      v_source_order.customer_email, v_source_order.customer_phone,
      v_source_order.company_name, v_source_order.cvr, v_source_order.address,
      v_source_order.zip_code, v_source_order.city, v_source_order.latitude, v_source_order.longitude,
      v_source_order.total_amount, 'pending', v_source_order.notes, v_source_order.payment_terms_days,
      (v_due_at AT TIME ZONE 'Europe/Copenhagen')::date,
      COALESCE(v_source_order.preferred_time_start, (v_due_at AT TIME ZONE 'Europe/Copenhagen')::time),
      v_source_order.preferred_time_end,
      v_source_order.estimated_duration_minutes, v_root, v_cycle,
      NULL
    ) RETURNING id INTO v_new_id;

    INSERT INTO public.order_items (order_id, service_id, service_name, quantity, unit_price, total_price, details)
    SELECT v_new_id, oi.service_id, oi.service_name, oi.quantity, oi.unit_price, oi.total_price, oi.details
      FROM public.order_items oi WHERE oi.order_id = v_source_order.id;

    SELECT * INTO v_source_stop
      FROM public.route_stops rs
     WHERE rs.order_id = v_source_order.id
     ORDER BY rs.completed_at DESC NULLS LAST, rs.created_at DESC
     LIMIT 1;

    v_route_id := COALESCE(r.preferred_route_id, v_source_stop.route_id);
    v_employee_id := v_source_stop.assigned_employee_id;

    IF v_route_id IS NOT NULL THEN
      SELECT COALESCE(MAX(sequence), 0) + 1 INTO v_sequence
        FROM public.route_stops
       WHERE route_id = v_route_id;

      INSERT INTO public.route_stops (
        route_id, order_id, subscription_id, sequence, planned_arrival, status,
        address, latitude, longitude, customer_name, customer_phone, service_summary,
        duration_minutes, time_window_start, time_window_end, assigned_employee_id, required_staff
      ) VALUES (
        v_route_id, v_new_id, r.id, v_sequence, v_due_at, 'pending',
        COALESCE(v_source_stop.address, v_source_order.address), v_source_order.latitude, v_source_order.longitude,
        v_source_order.customer_name, v_source_order.customer_phone, COALESCE(v_source_stop.service_summary, r.service_name),
        COALESCE(v_source_stop.duration_minutes, v_source_order.estimated_duration_minutes),
        v_source_order.preferred_time_start, v_source_order.preferred_time_end, v_employee_id,
        COALESCE(v_source_stop.required_staff, 1)
      );
    END IF;

    UPDATE public.subscriptions
       SET order_id = v_new_id,
           next_service_date = NULL,
           preferred_route_id = COALESCE(preferred_route_id, v_route_id),
           updated_at = now()
     WHERE id = r.id;

    INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation)
    SELECT v_source_order.business_id, 'order', v_new_id, 'create'
    WHERE EXISTS (
      SELECT 1 FROM public.accounting_integrations ai
       WHERE ai.business_id = v_source_order.business_id AND ai.is_active = true
    )
    ON CONFLICT DO NOTHING;

    PERFORM public.kick_accounting_sync(v_source_order.business_id);

    created_order_id := v_new_id;
    source_order_id  := v_source_order.id;
    RETURN NEXT;
  END LOOP;
END;
$function$;

DROP TRIGGER IF EXISTS trg_accounting_enqueue_orders ON public.orders;
DROP TRIGGER IF EXISTS trg_enqueue_sync_orders ON public.orders;
CREATE TRIGGER trg_accounting_enqueue_orders
AFTER INSERT OR UPDATE OR DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enqueue_accounting_sync();
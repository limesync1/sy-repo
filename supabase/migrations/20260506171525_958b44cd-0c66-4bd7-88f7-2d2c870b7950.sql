-- 1) Felter på services
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS product_number text,
  ADD COLUMN IF NOT EXISTS vat_zone text;

-- 2) Drop trigger der presser services i synk-køen — services skal kun synkes
--    når de faktisk bruges i en ordre (lazy via pushOrder).
DROP TRIGGER IF EXISTS trg_accounting_enqueue_services ON public.services;
DROP TRIGGER IF EXISTS trg_enqueue_sync_services ON public.services;

-- 3) Opdater auto_recur_due_orders til at understøtte 10_min, hver_4_uge, hver_8_uge
CREATE OR REPLACE FUNCTION public.auto_recur_due_orders()
 RETURNS TABLE(created_order_id uuid, source_order_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  r record;
  v_new_id uuid;
  v_interval text;
  v_next_at timestamptz;
  v_cycle int;
  v_root uuid;
BEGIN
  FOR r IN
    SELECT o.*
      FROM public.orders o
     WHERE o.next_service_date IS NOT NULL
       AND o.next_service_date <= now()
       AND o.status IN ('confirmed','completed')
       AND EXISTS (
         SELECT 1 FROM public.order_items oi
          WHERE oi.order_id = o.id
            AND (oi.details->>'interval') IS NOT NULL
            AND (oi.details->>'interval') <> 'engangskøb'
       )
  LOOP
    v_root  := COALESCE(r.parent_order_id, r.id);
    v_cycle := COALESCE(r.completed_cycles, 0) + 1;

    IF EXISTS (
      SELECT 1 FROM public.orders
       WHERE parent_order_id = v_root AND recurrence_cycle = v_cycle
    ) THEN
      SELECT (oi.details->>'interval') INTO v_interval
        FROM public.order_items oi WHERE oi.order_id = r.id
         AND (oi.details->>'interval') IS NOT NULL
         AND (oi.details->>'interval') <> 'engangskøb' LIMIT 1;
      v_next_at := now() + CASE v_interval
        WHEN '10_min'      THEN interval '10 minutes'
        WHEN 'daglig'      THEN interval '1 day'
        WHEN 'ugentlig'    THEN interval '7 days'
        WHEN 'hver_14_dag' THEN interval '14 days'
        WHEN 'hver_4_uge'  THEN interval '28 days'
        WHEN 'hver_8_uge'  THEN interval '56 days'
        WHEN 'månedlig'    THEN interval '30 days'
        WHEN 'kvartalsvis' THEN interval '90 days'
        WHEN 'halvårlig'   THEN interval '180 days'
        WHEN 'årlig'       THEN interval '365 days'
        ELSE interval '30 days' END;
      UPDATE public.orders SET next_service_date = v_next_at WHERE id = r.id;
      CONTINUE;
    END IF;

    SELECT (oi.details->>'interval') INTO v_interval
      FROM public.order_items oi WHERE oi.order_id = r.id
       AND (oi.details->>'interval') IS NOT NULL
       AND (oi.details->>'interval') <> 'engangskøb' LIMIT 1;
    v_next_at := now() + CASE v_interval
      WHEN '10_min'      THEN interval '10 minutes'
      WHEN 'daglig'      THEN interval '1 day'
      WHEN 'ugentlig'    THEN interval '7 days'
      WHEN 'hver_14_dag' THEN interval '14 days'
      WHEN 'hver_4_uge'  THEN interval '28 days'
      WHEN 'hver_8_uge'  THEN interval '56 days'
      WHEN 'månedlig'    THEN interval '30 days'
      WHEN 'kvartalsvis' THEN interval '90 days'
      WHEN 'halvårlig'   THEN interval '180 days'
      WHEN 'årlig'       THEN interval '365 days'
      ELSE interval '30 days' END;

    INSERT INTO public.orders (
      business_id, customer_id, customer_name, customer_email, customer_phone,
      company_name, cvr, address, zip_code, city, latitude, longitude,
      total_amount, status, notes, payment_terms_days,
      preferred_date, preferred_time_start, preferred_time_end,
      estimated_duration_minutes, parent_order_id, recurrence_cycle,
      next_service_date
    ) VALUES (
      r.business_id, r.customer_id, r.customer_name, r.customer_email, r.customer_phone,
      r.company_name, r.cvr, r.address, r.zip_code, r.city, r.latitude, r.longitude,
      r.total_amount, 'pending', r.notes, r.payment_terms_days,
      CURRENT_DATE, r.preferred_time_start, r.preferred_time_end,
      r.estimated_duration_minutes, v_root, v_cycle,
      v_next_at
    ) RETURNING id INTO v_new_id;

    INSERT INTO public.order_items (order_id, service_id, service_name, quantity, unit_price, total_price, details)
    SELECT v_new_id, oi.service_id, oi.service_name, oi.quantity, oi.unit_price, oi.total_price, oi.details
      FROM public.order_items oi WHERE oi.order_id = r.id;

    UPDATE public.orders
       SET next_service_date = v_next_at,
           completed_cycles  = v_cycle,
           updated_at = now()
     WHERE id = r.id;

    INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation)
    SELECT r.business_id, 'order', v_new_id, 'upsert'
    WHERE EXISTS (
      SELECT 1 FROM public.accounting_integrations ai
       WHERE ai.business_id = r.business_id AND ai.is_active = true
    )
    ON CONFLICT DO NOTHING;

    created_order_id := v_new_id;
    source_order_id  := r.id;
    RETURN NEXT;
  END LOOP;
END;
$function$;

-- 4) Opdater handle_route_stop_completion til samme udvidede interval-mapping
CREATE OR REPLACE FUNCTION public.handle_route_stop_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_order_id uuid;
  v_sub RECORD;
  v_next_at timestamptz;
  v_new_order_id uuid;
  v_old_order RECORD;
BEGIN
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  v_order_id := NEW.order_id;
  IF v_order_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_old_order FROM public.orders WHERE id = v_order_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  UPDATE public.orders
     SET status = 'completed',
         completed_cycles = COALESCE(completed_cycles, 0) + 1,
         updated_at = now()
   WHERE id = v_order_id;

  FOR v_sub IN
    SELECT id, service_id, service_name, total_price, interval, details
    FROM public.subscriptions
    WHERE order_id = v_order_id
      AND status = 'active'
      AND interval IS NOT NULL
      AND interval <> 'engangskøb'
  LOOP
    v_next_at := now() + CASE v_sub.interval
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
              END;

    INSERT INTO public.orders (
      business_id, customer_id, customer_name, customer_email, customer_phone,
      address, city, zip_code, latitude, longitude,
      status, total_amount, notes
    )
    VALUES (
      v_old_order.business_id, v_old_order.customer_id, v_old_order.customer_name,
      v_old_order.customer_email, v_old_order.customer_phone,
      v_old_order.address, v_old_order.city, v_old_order.zip_code,
      v_old_order.latitude, v_old_order.longitude,
      'pending', v_sub.total_price,
      'Auto-genereret fra abonnement (' || v_sub.interval || ')'
    )
    RETURNING id INTO v_new_order_id;

    INSERT INTO public.order_items (order_id, service_id, service_name, quantity, unit_price, total_price, details)
    VALUES (v_new_order_id, v_sub.service_id, v_sub.service_name, 1, v_sub.total_price, v_sub.total_price, v_sub.details);

    UPDATE public.subscriptions
       SET order_id = v_new_order_id,
           next_service_date = v_next_at,
           updated_at = now()
     WHERE id = v_sub.id;
  END LOOP;

  RETURN NEW;
END;
$function$;
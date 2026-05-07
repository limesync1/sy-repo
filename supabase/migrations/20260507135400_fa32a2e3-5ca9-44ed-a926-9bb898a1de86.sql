-- Defer creation of next recurring order to the cron (auto_recur_due_orders).
-- The previous trigger created a brand-new order + route_stop the moment the
-- old stop was marked completed, which caused immediate re-spawn for very
-- short intervals (e.g. "Hver 10. minut"). The trigger now only:
--   1) Marks the order completed and bumps completed_cycles.
--   2) Queues an invoice booking job if accounting is active.
--   3) Self-heals missing subscriptions.
--   4) Sets next_service_date on the completed order so the cron materialises
--      the next order/stop when the interval has actually elapsed.

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

  -- Find evt. interval på ordren
  SELECT (oi.details->>'interval') INTO v_interval
    FROM public.order_items oi
   WHERE oi.order_id = v_order_id
     AND (oi.details->>'interval') IS NOT NULL
     AND (oi.details->>'interval') <> 'engangskøb'
   LIMIT 1;

  IF v_interval IS NOT NULL THEN
    v_next_at := now() + CASE v_interval
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
  END IF;

  UPDATE public.orders
     SET status = 'completed',
         completed_cycles = COALESCE(completed_cycles, 0) + 1,
         next_service_date = CASE WHEN v_interval IS NOT NULL THEN v_next_at ELSE next_service_date END,
         updated_at = now()
   WHERE id = v_order_id;

  -- a) Bog faktura hvis aktiv regnskabsintegration
  SELECT EXISTS (
    SELECT 1 FROM public.accounting_integrations ai
     WHERE ai.business_id = v_old_order.business_id AND ai.is_active = true
  ) INTO v_accounting_active;

  IF v_accounting_active THEN
    INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation)
    VALUES (v_old_order.business_id, 'invoice', v_order_id, 'book')
    ON CONFLICT DO NOTHING;
  END IF;

  -- b) Self-healing: sørg for der findes en subscription for tilbagevendende ordre
  IF v_interval IS NOT NULL THEN
    INSERT INTO public.subscriptions (
      business_id, customer_id, service_id, order_id,
      service_name, interval, status, details, total_price, next_service_date
    )
    SELECT v_old_order.business_id, v_old_order.customer_id, oi.service_id, v_order_id,
           oi.service_name, oi.details->>'interval', 'active', oi.details, oi.total_price, v_next_at
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
       SET next_service_date = v_next_at, updated_at = now()
     WHERE order_id = v_order_id AND status = 'active';
  END IF;

  RETURN NEW;
END;
$function$;

-- 1) Drop the buggy "instant cycle" trigger and its function
DROP TRIGGER IF EXISTS zzz_auto_cycle_subscription_on_completion ON public.route_stops;
DROP FUNCTION IF EXISTS public.auto_cycle_subscription_on_completion();

-- 2) Replace handle_route_stop_completion to also delete the completed stop from the route
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
  END IF;

  -- Remove the completed stop from the route. Snapshot in employee_completed_stops
  -- is already created by trg_snapshot_completed_stop (AFTER UPDATE OF status).
  -- The recurring-orders cron will recreate a new stop on the same route + employee
  -- once next_service_date has been reached.
  DELETE FROM public.route_stops WHERE id = NEW.id;

  RETURN NEW;
END;
$function$;

-- 3) Clean up duplicate subscriptions (Anne and any other affected customer):
--    keep only the most recent active subscription per (order_id, COALESCE(service_id))
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY order_id, COALESCE(service_id::text, '')
           ORDER BY created_at DESC
         ) AS rn
    FROM public.subscriptions
   WHERE status = 'active'
)
UPDATE public.subscriptions s
   SET status = 'cancelled', updated_at = now()
  FROM ranked r
 WHERE s.id = r.id AND r.rn > 1;

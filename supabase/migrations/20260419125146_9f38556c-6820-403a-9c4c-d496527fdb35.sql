
-- Remember the route a recurring subscription was last serviced on
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS preferred_route_id uuid REFERENCES public.routes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_preferred_route ON public.subscriptions(preferred_route_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_order ON public.subscriptions(order_id);

-- Replace completion trigger function to also remember the last route on the subscription
CREATE OR REPLACE FUNCTION public.handle_route_stop_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_interval text;
  v_days int;
  v_order_id uuid;
BEGIN
  -- Only trigger when status changes to completed
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

  -- Find dominant interval on this order (first non-engangskøb wins)
  SELECT COALESCE(
           (SELECT (details->>'interval') FROM public.order_items
              WHERE order_id = v_order_id
                AND details->>'interval' IS NOT NULL
                AND details->>'interval' <> 'engangskøb'
              LIMIT 1),
           'engangskøb'
         )
  INTO v_interval;

  IF v_interval = 'engangskøb' OR v_interval IS NULL THEN
    -- One-off: close the order so it stays out of the pool
    UPDATE public.orders
       SET status = 'completed',
           completed_cycles = COALESCE(completed_cycles, 0) + 1,
           updated_at = now()
     WHERE id = v_order_id;
  ELSE
    v_days := CASE v_interval
                WHEN 'ugentlig'    THEN 7
                WHEN 'hver_14_dag' THEN 14
                WHEN 'månedlig'    THEN 30
                WHEN 'kvartalsvis' THEN 90
                WHEN 'halvårlig'   THEN 180
                WHEN 'årlig'       THEN 365
                ELSE 30
              END;

    UPDATE public.orders
       SET completed_cycles = COALESCE(completed_cycles, 0) + 1,
           next_service_date = (now() + (v_days || ' days')::interval),
           preferred_date    = (CURRENT_DATE + (v_days || ' days')::interval)::date,
           status            = 'confirmed',
           updated_at        = now()
     WHERE id = v_order_id;

    -- Remember preferred route on the subscription(s) for this order
    UPDATE public.subscriptions
       SET preferred_route_id = NEW.route_id,
           next_service_date  = (now() + (v_days || ' days')::interval),
           updated_at         = now()
     WHERE order_id = v_order_id
       AND status = 'active';
  END IF;

  RETURN NEW;
END;
$function$;

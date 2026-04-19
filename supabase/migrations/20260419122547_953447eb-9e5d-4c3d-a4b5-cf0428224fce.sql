
-- Smart subscription/recurring handling for route stops
-- When a route stop is marked completed:
--   - One-time orders: set order.status = 'completed' (won't return to pool)
--   - Recurring orders: bump completed_cycles + next_service_date based on interval; keep status='confirmed'
--     so it reappears in pool only at/near the next due date.

CREATE OR REPLACE FUNCTION public.handle_route_stop_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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

  -- Find the dominant interval on this order's items (first non-engangskøb wins)
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
    -- Recurring: bump cycle counter + push next_service_date forward
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
           status            = 'confirmed',  -- stay open / will requalify for the pool when due
           updated_at        = now()
     WHERE id = v_order_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_route_stop_completion ON public.route_stops;
CREATE TRIGGER trg_route_stop_completion
  AFTER INSERT OR UPDATE OF status ON public.route_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_route_stop_completion();

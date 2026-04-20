-- 1) Farve på ruter
ALTER TABLE public.routes
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#14b8a6';

-- 2) Erstat handle_route_stop_completion: generér en NY opgave (order + stop i poolen) pr. abonnement
CREATE OR REPLACE FUNCTION public.handle_route_stop_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_order_id uuid;
  v_sub RECORD;
  v_days int;
  v_new_order_id uuid;
  v_old_order RECORD;
BEGIN
  -- Kun ved overgang til completed
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

  -- Hent originale ordre-data (til at kopiere kunde-info)
  SELECT * INTO v_old_order FROM public.orders WHERE id = v_order_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Marker den oprindelige ordre som completed
  UPDATE public.orders
     SET status = 'completed',
         completed_cycles = COALESCE(completed_cycles, 0) + 1,
         updated_at = now()
   WHERE id = v_order_id;

  -- Loop over alle aktive abonnementer for denne ordre
  -- Hvert abonnement = én ny opgave i poolen (ingen rute, ingen dato)
  FOR v_sub IN
    SELECT id, service_id, service_name, total_price, interval, details
    FROM public.subscriptions
    WHERE order_id = v_order_id
      AND status = 'active'
      AND interval IS NOT NULL
      AND interval <> 'engangskøb'
  LOOP
    v_days := CASE v_sub.interval
                WHEN 'ugentlig'    THEN 7
                WHEN 'hver_14_dag' THEN 14
                WHEN 'månedlig'    THEN 30
                WHEN 'hver_4_uge'  THEN 28
                WHEN 'hver_8_uge'  THEN 56
                WHEN 'kvartalsvis' THEN 90
                WHEN 'halvårlig'   THEN 180
                WHEN 'årlig'       THEN 365
                ELSE 30
              END;

    -- Opret ny ordre (i opgavepoolen — ingen route_id, ingen preferred_date)
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

    -- Opret tilhørende order_item
    INSERT INTO public.order_items (order_id, service_id, service_name, quantity, unit_price, total_price, details)
    VALUES (v_new_order_id, v_sub.service_id, v_sub.service_name, 1, v_sub.total_price, v_sub.total_price, v_sub.details);

    -- Opdater abonnementet
    UPDATE public.subscriptions
       SET order_id = v_new_order_id,
           next_service_date = (now() + (v_days || ' days')::interval),
           updated_at = now()
     WHERE id = v_sub.id;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Sikr at trigger findes
DROP TRIGGER IF EXISTS trg_handle_route_stop_completion ON public.route_stops;
CREATE TRIGGER trg_handle_route_stop_completion
AFTER UPDATE ON public.route_stops
FOR EACH ROW
WHEN (NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed'))
EXECUTE FUNCTION public.handle_route_stop_completion();
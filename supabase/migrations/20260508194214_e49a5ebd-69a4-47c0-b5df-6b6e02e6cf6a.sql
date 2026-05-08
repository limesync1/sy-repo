CREATE OR REPLACE FUNCTION public.sync_subs_on_proposal_accept()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_items jsonb;
  v_item jsonb;
  v_handled uuid[];
  sub record;
  v_match jsonb;
  v_new_interval text;
  v_total numeric;
BEGIN
  IF NEW.customer_response = 'accepted'
     AND OLD.customer_response IS DISTINCT FROM 'accepted'
     AND NEW.business_response = 'adjusted'
     AND NEW.adjusted_details IS NOT NULL THEN

    v_items := COALESCE(NEW.adjusted_details->'items', '[]'::jsonb);
    v_handled := ARRAY[]::uuid[];

    FOR sub IN SELECT * FROM public.subscriptions WHERE order_id = NEW.id LOOP
      v_match := NULL;
      FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
        IF (v_item->>'service_id') IS NOT NULL
           AND (v_item->>'service_id')::uuid = sub.service_id THEN
          v_match := v_item; EXIT;
        END IF;
      END LOOP;
      IF v_match IS NULL AND jsonb_array_length(v_items) = 1 THEN
        v_match := v_items->0;
      END IF;

      IF v_match IS NOT NULL THEN
        IF (v_match->>'service_id') IS NOT NULL THEN
          v_handled := array_append(v_handled, (v_match->>'service_id')::uuid);
        END IF;
        v_new_interval := v_match->'details'->>'interval';
        v_total := COALESCE((v_match->>'total_price')::numeric, NEW.adjusted_amount, sub.total_price);

        IF COALESCE(v_new_interval, 'engangskøb') = 'engangskøb' THEN
          UPDATE public.subscriptions
             SET total_price = v_total,
                 details = COALESCE(sub.details, '{}'::jsonb) || COALESCE(v_match->'details', '{}'::jsonb),
                 interval = 'engangskøb',
                 status = 'cancelled',
                 cancelled_at = COALESCE(cancelled_at, now()),
                 updated_at = now()
           WHERE id = sub.id;
        ELSE
          UPDATE public.subscriptions
             SET total_price = v_total,
                 details = COALESCE(sub.details, '{}'::jsonb) || COALESCE(v_match->'details', '{}'::jsonb),
                 interval = v_new_interval,
                 status = 'active',
                 cancelled_at = NULL,
                 updated_at = now()
           WHERE id = sub.id;
        END IF;
      ELSE
        UPDATE public.subscriptions
           SET total_price = COALESCE(NEW.adjusted_amount, sub.total_price),
               updated_at = now()
         WHERE id = sub.id;
      END IF;
    END LOOP;

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
      v_new_interval := v_item->'details'->>'interval';
      IF v_new_interval IS NOT NULL
         AND v_new_interval <> 'engangskøb'
         AND (v_item->>'service_id') IS NOT NULL
         AND NOT ((v_item->>'service_id')::uuid = ANY(v_handled)) THEN
        INSERT INTO public.subscriptions (
          customer_id, business_id, service_id, order_id,
          service_name, interval, total_price, details, status,
          customer_email, customer_name
        ) VALUES (
          NEW.customer_id, NEW.business_id, (v_item->>'service_id')::uuid, NEW.id,
          COALESCE(v_item->>'service_name', 'Service'),
          v_new_interval,
          COALESCE((v_item->>'total_price')::numeric, 0),
          COALESCE(v_item->'details', '{}'::jsonb),
          'active',
          NEW.customer_email, NEW.customer_name
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

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

  SELECT COALESCE(
           (SELECT item->'details'->>'interval'
              FROM public.orders o
              CROSS JOIN LATERAL jsonb_array_elements(COALESCE(o.adjusted_details->'items', '[]'::jsonb)) AS item
             WHERE o.id = v_order_id
               AND o.business_response = 'adjusted'
               AND o.customer_response = 'accepted'
               AND item->'details'->>'interval' IS NOT NULL
               AND item->'details'->>'interval' <> 'engangskøb'
             LIMIT 1),
           (SELECT s.interval
              FROM public.subscriptions s
             WHERE s.order_id = v_order_id
               AND s.status = 'active'
               AND s.interval IS NOT NULL
               AND s.interval <> 'engangskøb'
             LIMIT 1),
           CASE
             WHEN EXISTS (
               SELECT 1
                 FROM public.orders o
                WHERE o.id = v_order_id
                  AND o.business_response = 'adjusted'
                  AND o.customer_response = 'accepted'
                  AND o.adjusted_details IS NOT NULL
             ) THEN 'engangskøb'
             ELSE (
               SELECT oi.details->>'interval'
                 FROM public.order_items oi
                WHERE oi.order_id = v_order_id
                  AND oi.details->>'interval' IS NOT NULL
                  AND oi.details->>'interval' <> 'engangskøb'
                LIMIT 1
             )
           END,
           'engangskøb'
         )
  INTO v_interval;

  IF v_interval = 'engangskøb' OR v_interval IS NULL THEN
    UPDATE public.orders
       SET status = 'completed',
           completed_cycles = COALESCE(completed_cycles, 0) + 1,
           updated_at = now()
     WHERE id = v_order_id;
  ELSE
    v_days := CASE v_interval
                WHEN '10_min'      THEN 1
                WHEN 'daglig'      THEN 1
                WHEN 'ugentlig'    THEN 7
                WHEN 'hver_14_dag' THEN 14
                WHEN 'hver_4_uge'  THEN 28
                WHEN 'hver_8_uge'  THEN 56
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

    UPDATE public.subscriptions
       SET preferred_route_id = NEW.route_id,
           next_service_date  = (now() + (v_days || ' days')::interval),
           updated_at         = now()
     WHERE order_id = v_order_id
       AND status = 'active'
       AND interval <> 'engangskøb';
  END IF;

  RETURN NEW;
END;
$function$;

UPDATE public.subscriptions s
   SET status = 'cancelled',
       cancelled_at = COALESCE(s.cancelled_at, now()),
       updated_at = now()
  FROM public.orders o
 WHERE s.order_id = o.id
   AND s.status = 'active'
   AND s.interval = 'engangskøb'
   AND o.business_response = 'adjusted'
   AND o.customer_response = 'accepted';
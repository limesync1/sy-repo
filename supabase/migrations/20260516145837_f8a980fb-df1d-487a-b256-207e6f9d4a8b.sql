CREATE OR REPLACE FUNCTION public.interval_to_duration(_interval text)
RETURNS interval
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v text := lower(trim(coalesce(_interval, '')));
  m text[];
  n int;
  u text;
BEGIN
  IF v = '' OR v IN ('engangskøb', 'engangskob', 'once') THEN
    RETURN NULL;
  END IF;

  CASE v
    WHEN '10_min'      THEN RETURN interval '10 minutes';
    WHEN 'daglig'      THEN RETURN interval '1 day';
    WHEN 'hver_2_dag'  THEN RETURN interval '2 days';
    WHEN 'ugentlig'    THEN RETURN interval '1 week';
    WHEN 'hver_14_dag' THEN RETURN interval '2 weeks';
    WHEN 'hver_3_uge'  THEN RETURN interval '3 weeks';
    WHEN 'hver_4_uge'  THEN RETURN interval '4 weeks';
    WHEN 'hver_8_uge'  THEN RETURN interval '8 weeks';
    WHEN 'månedlig'    THEN RETURN interval '1 month';
    WHEN 'kvartalsvis' THEN RETURN interval '3 months';
    WHEN 'halvårlig'   THEN RETURN interval '6 months';
    WHEN 'årlig'       THEN RETURN interval '1 year';
    ELSE NULL;
  END CASE;

  v := regexp_replace(replace(replace(replace(v, '.', ''), '_', ' '), '-', ' '), '\s+', ' ', 'g');
  m := regexp_match(v, '^(?:hver|hvert|every)\s+(\d+)\s+(day|days|dag|dage|week|weeks|uge|uger|month|months|måned|maaned|måneder|maaneder|year|years|år|aar)$');
  IF m IS NOT NULL THEN
    n := greatest(1, m[1]::int);
    u := m[2];
    IF u IN ('day','days','dag','dage') THEN
      RETURN make_interval(days => n);
    ELSIF u IN ('week','weeks','uge','uger') THEN
      RETURN make_interval(weeks => n);
    ELSIF u IN ('month','months','måned','maaned','måneder','maaneder') THEN
      RETURN make_interval(months => n);
    ELSIF u IN ('year','years','år','aar') THEN
      RETURN make_interval(years => n);
    END IF;
  END IF;

  RETURN interval '30 days';
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_route_stop_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_interval text;
  v_duration interval;
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
           (SELECT COALESCE(s.details->>'interval', s.interval)
              FROM public.subscriptions s
             WHERE s.order_id = v_order_id
               AND s.status = 'active'
               AND COALESCE(s.details->>'interval', s.interval) IS NOT NULL
               AND COALESCE(s.details->>'interval', s.interval) <> 'engangskøb'
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

  v_duration := public.interval_to_duration(v_interval);

  IF v_duration IS NULL THEN
    UPDATE public.orders
       SET status = 'completed',
           completed_cycles = COALESCE(completed_cycles, 0) + 1,
           updated_at = now()
     WHERE id = v_order_id;
  ELSE
    UPDATE public.orders
       SET completed_cycles = COALESCE(completed_cycles, 0) + 1,
           next_service_date = now() + v_duration,
           preferred_date    = (CURRENT_DATE + v_duration)::date,
           status            = 'confirmed',
           updated_at        = now()
     WHERE id = v_order_id;

    UPDATE public.subscriptions
       SET preferred_route_id = NEW.route_id,
           next_service_date  = now() + public.interval_to_duration(COALESCE(details->>'interval', interval)),
           updated_at         = now()
     WHERE order_id = v_order_id
       AND status = 'active'
       AND interval <> 'engangskøb'
       AND public.interval_to_duration(COALESCE(details->>'interval', interval)) IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$$;
-- Når et stop udføres, opretter vi nu OGSÅ den næste kørsels ordrerække
-- med det samme (i stedet for at vente på den natlige cron).
-- Dette sikrer at:
--   • Den udførte aftale flyttes til "Udførte" (status=completed).
--   • Den næste kørsel dukker straks op under "Aktive" som "X. kørsel".
--   • Når den projicerede rutedag åbnes, materialiseres stoppet og
--     accounting-køen får automatisk et "create_order" job
--     (via enqueue_order_for_new_occurrence).

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
  v_occ_id uuid;
  v_next_occ_id uuid;
BEGIN
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  v_occ_id := NEW.agreement_occurrence_id;

  IF v_occ_id IS NOT NULL THEN
    UPDATE public.agreement_occurrences
       SET status = 'completed',
           completed_at = COALESCE(NEW.completed_at, now()),
           route_id = NEW.route_id,
           updated_at = now()
     WHERE id = v_occ_id
       AND status <> 'completed';

    v_next_occ_id := public.ensure_next_agreement_occurrence(v_occ_id);

    SELECT legacy_order_id INTO v_order_id
      FROM public.agreement_occurrences
     WHERE id = v_occ_id;
    v_order_id := COALESCE(NEW.order_id, v_order_id);

    IF v_order_id IS NOT NULL THEN
      UPDATE public.orders
         SET status = 'completed',
             completed_cycles = GREATEST(
               COALESCE(completed_cycles, 0) + 1,
               COALESCE((SELECT sequence_index + 1 FROM public.agreement_occurrences WHERE id = v_occ_id), 1)
             ),
             updated_at = now()
       WHERE id = v_order_id;
    END IF;

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
       SET status = 'completed',
           completed_cycles = COALESCE(completed_cycles, 0) + 1,
           next_service_date = now() + v_duration,
           updated_at = now()
     WHERE id = v_order_id;

    -- Bump abonnementet og sæt next_service_date = NU så
    -- auto_recur_due_orders straks opretter næste kørsel som en ny ordre.
    -- Funktionen sætter selv next_service_date til den korrekte fremtidige
    -- dato efter oprettelsen.
    UPDATE public.subscriptions
       SET preferred_route_id = COALESCE(preferred_route_id, NEW.route_id),
           next_service_date  = now(),
           updated_at         = now()
     WHERE order_id = v_order_id
       AND status = 'active'
       AND interval <> 'engangskøb'
       AND public.interval_to_duration(COALESCE(details->>'interval', interval)) IS NOT NULL;

    PERFORM public.auto_recur_due_orders();
  END IF;

  RETURN NEW;
END;
$$;
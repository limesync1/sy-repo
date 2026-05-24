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
  v_next_at timestamptz;
BEGIN
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  v_occ_id := NEW.agreement_occurrence_id;

  -- 1) Aftale-baseret flow: opret næste occurrence på den fremtidige dato
  --    (håndteres af ensure_next_agreement_occurrence — den vælger eller
  --     opretter den korrekte fremtidige rute, ikke den aktive).
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

  -- 2) Legacy flow (abonnement/ordre uden aftale): markér ordren som
  --    fuldført og PLANLÆG næste kørsel frem i tiden — opret den IKKE nu.
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
           (SELECT oi.details->>'interval'
              FROM public.order_items oi
             WHERE oi.order_id = v_order_id
               AND oi.details->>'interval' IS NOT NULL
               AND oi.details->>'interval' <> 'engangskøb'
             LIMIT 1),
           'engangskøb'
         )
  INTO v_interval;

  v_duration := public.interval_to_duration(v_interval);

  IF v_duration IS NULL THEN
    -- Engangskøb: bare markér som fuldført.
    UPDATE public.orders
       SET status = 'completed',
           completed_cycles = COALESCE(completed_cycles, 0) + 1,
           updated_at = now()
     WHERE id = v_order_id;
  ELSE
    -- Beregn næste planlagte tidspunkt ud fra rutens (eller stoppets) faktiske
    -- udførelses-tidspunkt og intervallet, IKKE now().
    v_next_at := COALESCE(NEW.completed_at, now()) + v_duration;

    UPDATE public.orders
       SET status = 'completed',
           completed_cycles = COALESCE(completed_cycles, 0) + 1,
           next_service_date = v_next_at,
           updated_at = now()
     WHERE id = v_order_id;

    -- Planlæg abonnementets næste kørsel FREMAD. Cron-jobbet
    -- (auto_recur_due_orders) opretter selv ny ordre + stop på den
    -- korrekte fremtidige dato — vi må IKKE køre den nu, da det vil
    -- placere stoppet i den nuværende aktive rute.
    UPDATE public.subscriptions
       SET preferred_route_id = COALESCE(preferred_route_id, NEW.route_id),
           next_service_date  = v_next_at,
           updated_at         = now()
     WHERE order_id = v_order_id
       AND status = 'active'
       AND interval <> 'engangskøb'
       AND public.interval_to_duration(COALESCE(details->>'interval', interval)) IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$$;
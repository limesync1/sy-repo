
-- =============================================================================
-- Bølge 3.3: konsolidér trg_route_stop_completed_* til perform_completion()
-- =============================================================================
-- Helper-funktionerne herunder indeholder VERBATIM kopier af de eksisterende
-- trigger-funktioners bodies, men som void-returnerende almindelige funktioner
-- der modtager NEW (og er styret af orchestrator-triggerens WHEN-clause).

-- 1) _apply_completion_handle ------------------------------------------------
CREATE OR REPLACE FUNCTION public._apply_completion_handle(_new public.route_stops)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_interval text;
  v_duration interval;
  v_order_id uuid;
  v_occ_id uuid;
  v_next_occ_id uuid;
  v_next_at timestamptz;
BEGIN
  v_occ_id := _new.agreement_occurrence_id;

  -- 1) Aftale-baseret flow.
  IF v_occ_id IS NOT NULL THEN
    UPDATE public.agreement_occurrences
       SET status = 'completed',
           completed_at = COALESCE(_new.completed_at, now()),
           route_id = _new.route_id,
           updated_at = now()
     WHERE id = v_occ_id
       AND status <> 'completed';

    v_next_occ_id := public.ensure_next_agreement_occurrence(v_occ_id);

    SELECT legacy_order_id INTO v_order_id
      FROM public.agreement_occurrences
     WHERE id = v_occ_id;
    v_order_id := COALESCE(_new.order_id, v_order_id);

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

    RETURN;
  END IF;

  -- 2) Legacy flow.
  v_order_id := _new.order_id;
  IF v_order_id IS NULL THEN
    RETURN;
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
    UPDATE public.orders
       SET status = 'completed',
           completed_cycles = COALESCE(completed_cycles, 0) + 1,
           updated_at = now()
     WHERE id = v_order_id;
  ELSE
    v_next_at := COALESCE(_new.completed_at, now()) + v_duration;

    UPDATE public.orders
       SET status = 'completed',
           completed_cycles = COALESCE(completed_cycles, 0) + 1,
           next_service_date = v_next_at,
           updated_at = now()
     WHERE id = v_order_id;

    UPDATE public.subscriptions
       SET preferred_route_id = COALESCE(preferred_route_id, _new.route_id),
           next_service_date  = v_next_at,
           updated_at         = now()
     WHERE order_id = v_order_id
       AND status = 'active'
       AND interval <> 'engangskøb'
       AND public.interval_to_duration(COALESCE(details->>'interval', interval)) IS NOT NULL;
  END IF;
END;
$$;

-- 2) _apply_completion_invoice ----------------------------------------------
CREATE OR REPLACE FUNCTION public._apply_completion_invoice(_new public.route_stops)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_business_id uuid;
  v_has_integration boolean := false;
  v_occ_invoiced boolean := false;
  v_order_invoiced boolean := false;
BEGIN
  SELECT r.business_id
    INTO v_business_id
  FROM public.routes r
  WHERE r.id = _new.route_id;

  IF v_business_id IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.accounting_integrations ai
    WHERE ai.business_id = v_business_id
      AND ai.is_active = true
  ) INTO v_has_integration;

  IF NOT v_has_integration THEN
    RETURN;
  END IF;

  IF _new.agreement_occurrence_id IS NOT NULL THEN
    SELECT ao.invoice_external_id IS NOT NULL
      INTO v_occ_invoiced
    FROM public.agreement_occurrences ao
    WHERE ao.id = _new.agreement_occurrence_id;

    IF COALESCE(v_occ_invoiced, false) = false THEN
      INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation, status, scheduled_for)
      SELECT v_business_id, 'agreement_occurrence', _new.agreement_occurrence_id, 'invoice', 'pending', now()
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.accounting_sync_queue q
        WHERE q.business_id = v_business_id
          AND q.entity_type = 'agreement_occurrence'
          AND q.entity_id = _new.agreement_occurrence_id
          AND q.status IN ('pending', 'processing')
      );
    END IF;
  END IF;

  IF _new.order_id IS NOT NULL THEN
    SELECT o.invoice_external_id IS NOT NULL
      INTO v_order_invoiced
    FROM public.orders o
    WHERE o.id = _new.order_id;

    IF COALESCE(v_order_invoiced, false) = false THEN
      INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation, status, scheduled_for)
      SELECT v_business_id, 'invoice', _new.order_id, 'book', 'pending', now()
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.accounting_sync_queue q
        WHERE q.business_id = v_business_id
          AND q.entity_type = 'invoice'
          AND q.entity_id = _new.order_id
          AND q.status IN ('pending', 'processing')
      );
    END IF;
  END IF;
END;
$$;

-- 3) _apply_completion_duration ---------------------------------------------
CREATE OR REPLACE FUNCTION public._apply_completion_duration(_new public.route_stops)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_business_id uuid;
  v_customer_email text;
  v_service_id uuid;
  v_entry RECORD;
  v_avg numeric;
  v_count integer;
  v_team_estimate numeric;
BEGIN
  IF _new.order_id IS NULL THEN RETURN; END IF;

  SELECT o.business_id, o.customer_email, oi.service_id
    INTO v_business_id, v_customer_email, v_service_id
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id
  WHERE o.id = _new.order_id
  LIMIT 1;

  IF v_service_id IS NULL OR v_business_id IS NULL THEN RETURN; END IF;

  FOR v_entry IN
    SELECT employee_id, duration_minutes
    FROM stop_time_entries
    WHERE stop_id = _new.id
      AND ended_at IS NOT NULL
      AND duration_minutes IS NOT NULL
      AND duration_minutes > 0
  LOOP
    WITH recent AS (
      SELECT ste.duration_minutes,
             ROW_NUMBER() OVER (ORDER BY rs.completed_at DESC) AS rn
      FROM stop_time_entries ste
      JOIN route_stops rs ON rs.id = ste.stop_id
      JOIN orders o ON o.id = rs.order_id
      JOIN order_items oi ON oi.order_id = o.id
      WHERE ste.employee_id = v_entry.employee_id
        AND ste.ended_at IS NOT NULL
        AND ste.duration_minutes IS NOT NULL
        AND o.business_id = v_business_id
        AND o.customer_email = v_customer_email
        AND oi.service_id = v_service_id
        AND rs.status = 'completed'
      LIMIT 5
    )
    SELECT SUM(duration_minutes * w) / NULLIF(SUM(w), 0), COUNT(*)
      INTO v_avg, v_count
    FROM (
      SELECT duration_minutes,
             CASE rn WHEN 1 THEN 5.0 WHEN 2 THEN 3.0 WHEN 3 THEN 2.0 WHEN 4 THEN 1.5 ELSE 1.0 END AS w
      FROM recent
    ) weighted;

    IF v_avg IS NULL OR v_avg <= 0 THEN CONTINUE; END IF;

    INSERT INTO service_employee_durations
      (business_id, service_id, employee_id, customer_email, avg_minutes, sample_count, last_minutes, last_completed_at)
    VALUES
      (v_business_id, v_service_id, v_entry.employee_id, v_customer_email, v_avg, v_count, v_entry.duration_minutes, now())
    ON CONFLICT (business_id, service_id, employee_id, customer_email)
    DO UPDATE SET
      avg_minutes = EXCLUDED.avg_minutes,
      sample_count = EXCLUDED.sample_count,
      last_minutes = EXCLUDED.last_minutes,
      last_completed_at = EXCLUDED.last_completed_at,
      updated_at = now();
  END LOOP;

  WITH stop_team_avg AS (
    SELECT MAX(sed.avg_minutes) AS team_min
    FROM stop_time_entries ste
    LEFT JOIN service_employee_durations sed ON
      sed.employee_id = ste.employee_id
      AND sed.business_id = v_business_id
      AND sed.service_id = v_service_id
      AND sed.customer_email = v_customer_email
    WHERE ste.stop_id = _new.id AND ste.ended_at IS NOT NULL
  )
  SELECT team_min INTO v_team_estimate FROM stop_team_avg;

  IF v_team_estimate IS NULL OR v_team_estimate <= 0 THEN RETURN; END IF;

  UPDATE route_stops rs
     SET duration_minutes = COALESCE((
           SELECT GREATEST(MAX(sed.avg_minutes), 1)
           FROM route_stop_assignees rsa
           JOIN service_employee_durations sed ON sed.employee_id = rsa.employee_id
           WHERE rsa.stop_id = rs.id
             AND sed.business_id = v_business_id
             AND sed.service_id = v_service_id
             AND sed.customer_email = v_customer_email
         ), ROUND(v_team_estimate)::int),
         updated_at = now()
    FROM orders o, order_items oi
   WHERE rs.order_id = o.id
     AND oi.order_id = o.id
     AND o.business_id = v_business_id
     AND o.customer_email = v_customer_email
     AND oi.service_id = v_service_id
     AND rs.status = 'pending'
     AND rs.id <> _new.id;

  UPDATE orders
     SET estimated_duration_minutes = ROUND(v_team_estimate)::int,
         updated_at = now()
   WHERE business_id = v_business_id
     AND customer_email = v_customer_email
     AND status IN ('pending','confirmed')
     AND id IN (SELECT oi2.order_id FROM order_items oi2 WHERE oi2.service_id = v_service_id);
END;
$$;

-- 4) Orchestrator: perform_completion() -------------------------------------
CREATE OR REPLACE FUNCTION public.perform_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_biz uuid;
  v_started timestamptz := clock_timestamp();
BEGIN
  -- Bevarer original alfabetisk affyrings-rækkefølge:
  -- 1) enqueue_invoice_when_route_stop_completed
  -- 2) handle_route_stop_completion
  -- 3) update_service_duration_estimate
  PERFORM public._apply_completion_invoice(NEW);
  PERFORM public._apply_completion_handle(NEW);
  PERFORM public._apply_completion_duration(NEW);

  -- Observability (Bølge 3.1/3.2 event-log)
  SELECT business_id INTO v_biz FROM public.routes WHERE id = NEW.route_id;
  PERFORM public.log_route_event(
    v_biz,
    'route_stop',
    NEW.id,
    'COMPLETION_PIPELINE_RUN',
    jsonb_build_object(
      'route_id', NEW.route_id,
      'order_id', NEW.order_id,
      'agreement_occurrence_id', NEW.agreement_occurrence_id,
      'duration_ms', EXTRACT(EPOCH FROM clock_timestamp() - v_started) * 1000
    ),
    NEW.route_id,
    NULL
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public._apply_completion_handle(public.route_stops) FROM public;
REVOKE ALL ON FUNCTION public._apply_completion_invoice(public.route_stops) FROM public;
REVOKE ALL ON FUNCTION public._apply_completion_duration(public.route_stops) FROM public;
REVOKE ALL ON FUNCTION public.perform_completion() FROM public;

-- 5) Erstat de tre triggers med ÉN orchestrator-trigger --------------------
DROP TRIGGER IF EXISTS trg_handle_route_stop_completion ON public.route_stops;
DROP TRIGGER IF EXISTS trg_enqueue_invoice_when_route_stop_completed ON public.route_stops;
DROP TRIGGER IF EXISTS trg_update_service_duration_estimate ON public.route_stops;

DROP TRIGGER IF EXISTS trg_perform_completion ON public.route_stops;
CREATE TRIGGER trg_perform_completion
  AFTER UPDATE OF status ON public.route_stops
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION public.perform_completion();

COMMENT ON FUNCTION public.perform_completion() IS
  'Bølge 3.3: konsoliderer de tre tidligere trg_route_stop_completed_*-triggers. Affyres kun ved status-transition til completed.';
COMMENT ON FUNCTION public.handle_route_stop_completion() IS
  'DEPRECATED Bølge 3.3 — logikken er flyttet til _apply_completion_handle og kaldes via perform_completion(). Funktionen bevares for at undgå brud på eksterne kald, men trigger trg_handle_route_stop_completion er fjernet.';
COMMENT ON FUNCTION public.enqueue_invoice_when_route_stop_completed() IS
  'DEPRECATED Bølge 3.3 — flyttet til _apply_completion_invoice.';
COMMENT ON FUNCTION public.update_service_duration_estimate() IS
  'DEPRECATED Bølge 3.3 — flyttet til _apply_completion_duration.';

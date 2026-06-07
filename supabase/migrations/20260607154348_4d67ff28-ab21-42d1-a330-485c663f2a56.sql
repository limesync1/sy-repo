-- Stop same-day recurrence loops for legacy order/subscription flow and make accounting links less brittle.

-- External numbers may overlap between provider namespaces (order drafts vs invoice drafts/booked invoices),
-- so the uniqueness must include the external_type. Keep the internal order/occurrence uniqueness intact.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'accounting_order_links_business_id_provider_external_id_key'
      AND conrelid = 'public.accounting_order_links'::regclass
  ) THEN
    ALTER TABLE public.accounting_order_links
      DROP CONSTRAINT accounting_order_links_business_id_provider_external_id_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS accounting_order_links_business_provider_type_external_uniq
  ON public.accounting_order_links (business_id, provider, external_type, external_id)
  WHERE external_id IS NOT NULL AND external_type IS NOT NULL;

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
  v_completed_at timestamptz;
  v_completed_local timestamp;
  v_next_local timestamp;
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
    v_completed_at := COALESCE(_new.completed_at, now());
    v_next_at := v_completed_at + v_duration;

    -- HÅRD CAP for legacy subscriptions too: max én kørsel pr. kalenderdag.
    -- Hvis minut-/time-cadence lander på samme danske dato, flyttes næste kørsel
    -- til næste dag med samme lokale klokkeslæt som den beregnede næste tid.
    v_completed_local := v_completed_at AT TIME ZONE 'Europe/Copenhagen';
    v_next_local := v_next_at AT TIME ZONE 'Europe/Copenhagen';
    IF v_next_local::date <= v_completed_local::date THEN
      v_next_at := (((v_completed_local::date + 1)::timestamp + v_next_local::time) AT TIME ZONE 'Europe/Copenhagen');
    END IF;

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

CREATE OR REPLACE FUNCTION public.auto_recur_due_orders()
RETURNS TABLE(created_order_id uuid, source_order_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  r record;
  v_source_order RECORD;
  v_source_stop RECORD;
  v_completed_snapshot RECORD;
  v_new_id uuid;
  v_due_at timestamptz;
  v_next_at timestamptz;
  v_due_local timestamp;
  v_next_local timestamp;
  v_root uuid;
  v_cycle int;
  v_route_id uuid;
  v_employee_id uuid;
  v_sequence int;
  v_agreement_id uuid;
  v_occ_id uuid;
BEGIN
  FOR r IN
    SELECT s.*
      FROM public.subscriptions s
     WHERE s.status = 'active'
       AND s.next_service_date IS NOT NULL
       AND s.next_service_date <= now()
       AND s.interval IS NOT NULL
       AND s.interval <> 'engangskøb'
     FOR UPDATE SKIP LOCKED
  LOOP
    SELECT * INTO v_source_order FROM public.orders WHERE id = r.order_id;
    IF NOT FOUND THEN
      UPDATE public.subscriptions
         SET next_service_date = now() + public.interval_to_duration(r.interval),
             updated_at = now()
       WHERE id = r.id;
      CONTINUE;
    END IF;

    IF v_source_order.status NOT IN ('completed','confirmed') THEN
      CONTINUE;
    END IF;

    v_due_at := r.next_service_date;
    v_next_at := v_due_at + public.interval_to_duration(r.interval);
    v_due_local := v_due_at AT TIME ZONE 'Europe/Copenhagen';
    v_next_local := v_next_at AT TIME ZONE 'Europe/Copenhagen';
    IF v_next_local::date <= v_due_local::date THEN
      v_next_at := (((v_due_local::date + 1)::timestamp + v_next_local::time) AT TIME ZONE 'Europe/Copenhagen');
    END IF;

    v_root := COALESCE(v_source_order.parent_order_id, v_source_order.id);
    v_cycle := COALESCE(v_source_order.recurrence_cycle, 0) + 1;

    -- Same appointment may only exist once per day, regardless of minute/hour cadence.
    IF EXISTS (
      SELECT 1
      FROM public.orders o
      JOIN public.route_stops rs ON rs.order_id = o.id
      JOIN public.routes rt ON rt.id = rs.route_id
      WHERE COALESCE(o.parent_order_id, o.id) = v_root
        AND o.status <> 'cancelled'
        AND rt.route_date = (v_due_at AT TIME ZONE 'Europe/Copenhagen')::date
    ) THEN
      UPDATE public.subscriptions SET next_service_date = v_next_at, updated_at = now() WHERE id = r.id;
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.orders o
       WHERE o.parent_order_id = v_root
         AND o.recurrence_cycle = v_cycle
         AND o.status <> 'cancelled'
    ) THEN
      UPDATE public.subscriptions SET next_service_date = v_next_at, updated_at = now() WHERE id = r.id;
      CONTINUE;
    END IF;

    INSERT INTO public.orders (
      business_id, customer_id, customer_name, customer_email, customer_phone,
      company_name, cvr, address, zip_code, city, latitude, longitude,
      total_amount, status, notes, payment_terms_days,
      preferred_date, preferred_time_start, preferred_time_end,
      estimated_duration_minutes, parent_order_id, recurrence_cycle, next_service_date,
      customer_response, requires_customer_approval
    ) VALUES (
      v_source_order.business_id, v_source_order.customer_id, v_source_order.customer_name,
      v_source_order.customer_email, v_source_order.customer_phone,
      v_source_order.company_name, v_source_order.cvr, v_source_order.address,
      v_source_order.zip_code, v_source_order.city, v_source_order.latitude, v_source_order.longitude,
      v_source_order.total_amount, 'confirmed', v_source_order.notes, v_source_order.payment_terms_days,
      (v_due_at AT TIME ZONE 'Europe/Copenhagen')::date,
      COALESCE(v_source_order.preferred_time_start, (v_due_at AT TIME ZONE 'Europe/Copenhagen')::time),
      v_source_order.preferred_time_end,
      v_source_order.estimated_duration_minutes, v_root, v_cycle, NULL,
      'accepted', false
    ) RETURNING id INTO v_new_id;

    INSERT INTO public.order_items (order_id, service_id, service_name, quantity, unit_price, total_price, details)
    SELECT v_new_id, oi.service_id, oi.service_name, oi.quantity, oi.unit_price, oi.total_price, oi.details
      FROM public.order_items oi WHERE oi.order_id = v_source_order.id;

    SELECT * INTO v_source_stop FROM public.route_stops rs
     WHERE rs.order_id = v_source_order.id
     ORDER BY rs.completed_at DESC NULLS LAST, rs.created_at DESC LIMIT 1;

    SELECT * INTO v_completed_snapshot FROM public.employee_completed_stops ecs
     WHERE ecs.order_id = v_source_order.id
        OR (ecs.business_id = v_source_order.business_id
            AND ecs.customer_name = v_source_order.customer_name
            AND ecs.service_summary = r.service_name)
     ORDER BY ecs.completed_at DESC NULLS LAST, ecs.created_at DESC LIMIT 1;

    v_route_id := COALESCE(r.preferred_route_id, v_source_stop.route_id, v_completed_snapshot.route_id);
    v_employee_id := COALESCE(v_source_stop.assigned_employee_id, v_completed_snapshot.employee_id);

    SELECT id INTO v_agreement_id FROM public.agreements WHERE legacy_subscription_id = r.id;
    IF v_agreement_id IS NOT NULL THEN
      INSERT INTO public.agreement_occurrences (
        agreement_id, business_id, occurrence_date, sequence_index, status,
        route_id, employee_ids, planned_arrival, legacy_order_id
      ) VALUES (
        v_agreement_id, v_source_order.business_id,
        (v_due_at AT TIME ZONE 'Europe/Copenhagen')::date,
        0, 'planned'::public.occurrence_status,
        v_route_id,
        CASE WHEN v_employee_id IS NULL THEN '{}'::uuid[] ELSE ARRAY[v_employee_id] END,
        v_due_at, v_new_id
      ) ON CONFLICT DO NOTHING
      RETURNING id INTO v_occ_id;
    END IF;

    IF v_route_id IS NOT NULL THEN
      SELECT COALESCE(MAX(sequence), 0) + 1 INTO v_sequence FROM public.route_stops WHERE route_id = v_route_id;

      INSERT INTO public.route_stops (
        route_id, order_id, subscription_id, agreement_occurrence_id, sequence, planned_arrival, status,
        address, latitude, longitude, customer_name, customer_phone, service_summary,
        duration_minutes, time_window_start, time_window_end, assigned_employee_id, required_staff
      ) VALUES (
        v_route_id, v_new_id, r.id, v_occ_id, v_sequence, v_due_at, 'pending',
        COALESCE(v_source_stop.address, v_completed_snapshot.address, v_source_order.address),
        v_source_order.latitude, v_source_order.longitude,
        v_source_order.customer_name, v_source_order.customer_phone,
        COALESCE(v_source_stop.service_summary, v_completed_snapshot.service_summary, r.service_name),
        COALESCE(v_source_stop.duration_minutes, v_completed_snapshot.duration_minutes, v_source_order.estimated_duration_minutes),
        v_source_order.preferred_time_start, v_source_order.preferred_time_end, v_employee_id,
        COALESCE(v_source_stop.required_staff, 1)
      )
      ON CONFLICT DO NOTHING;
    END IF;

    UPDATE public.subscriptions
       SET order_id = v_new_id,
           next_service_date = v_next_at,
           preferred_route_id = COALESCE(preferred_route_id, v_route_id),
           updated_at = now()
     WHERE id = r.id;

    INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation)
    SELECT v_source_order.business_id, 'order', v_new_id, 'create'
    WHERE EXISTS (SELECT 1 FROM public.accounting_integrations ai WHERE ai.business_id = v_source_order.business_id AND ai.is_active = true)
    ON CONFLICT DO NOTHING;

    PERFORM public.kick_accounting_sync(v_source_order.business_id);

    created_order_id := v_new_id;
    source_order_id  := v_source_order.id;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Stop the currently looping Lonnie test jobs until the deployed function code can recover from external_order_number.
UPDATE public.accounting_sync_queue
   SET status = 'failed',
       last_error = 'Stoppet automatisk: dubletbeskyttelse deployes før ny synkronisering.',
       scheduled_for = now() + interval '1 day',
       updated_at = now()
 WHERE entity_id = 'af38123d-b14f-44bc-8157-03d3c9a751eb'::uuid
   AND status IN ('pending','processing');

-- Move the active test subscription to the next day so the calendar keeps exactly one same-day appointment.
UPDATE public.subscriptions
   SET next_service_date = (((now() AT TIME ZONE 'Europe/Copenhagen')::date + 1)::timestamp + COALESCE((next_service_date AT TIME ZONE 'Europe/Copenhagen')::time, time '09:00')) AT TIME ZONE 'Europe/Copenhagen',
       updated_at = now()
 WHERE id = 'ed438ab6-04d3-4e09-8d38-3c31225571b4'::uuid
   AND next_service_date IS NOT NULL
   AND (next_service_date AT TIME ZONE 'Europe/Copenhagen')::date <= (now() AT TIME ZONE 'Europe/Copenhagen')::date;
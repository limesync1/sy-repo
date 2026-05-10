CREATE OR REPLACE FUNCTION public.auto_recur_due_orders()
 RETURNS TABLE(created_order_id uuid, source_order_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  r record;
  v_source_order RECORD;
  v_source_stop RECORD;
  v_completed_snapshot RECORD;
  v_new_id uuid;
  v_due_at timestamptz;
  v_next_at timestamptz;
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
  LOOP
    SELECT * INTO v_source_order FROM public.orders WHERE id = r.order_id;
    IF NOT FOUND THEN
      UPDATE public.subscriptions SET next_service_date = now() + public.interval_to_duration(r.interval), updated_at = now() WHERE id = r.id;
      CONTINUE;
    END IF;

    IF v_source_order.status NOT IN ('completed','confirmed') THEN
      CONTINUE;
    END IF;

    v_due_at := r.next_service_date;
    v_next_at := v_due_at + public.interval_to_duration(r.interval);
    v_root := COALESCE(v_source_order.parent_order_id, v_source_order.id);
    v_cycle := COALESCE(v_source_order.recurrence_cycle, 0) + 1;

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
      estimated_duration_minutes, parent_order_id, recurrence_cycle, next_service_date
    ) VALUES (
      v_source_order.business_id, v_source_order.customer_id, v_source_order.customer_name,
      v_source_order.customer_email, v_source_order.customer_phone,
      v_source_order.company_name, v_source_order.cvr, v_source_order.address,
      v_source_order.zip_code, v_source_order.city, v_source_order.latitude, v_source_order.longitude,
      v_source_order.total_amount, 'pending', v_source_order.notes, v_source_order.payment_terms_days,
      (v_due_at AT TIME ZONE 'Europe/Copenhagen')::date,
      COALESCE(v_source_order.preferred_time_start, (v_due_at AT TIME ZONE 'Europe/Copenhagen')::time),
      v_source_order.preferred_time_end,
      v_source_order.estimated_duration_minutes, v_root, v_cycle, NULL
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

    -- Find or create the matching agreement and create an occurrence
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
      );
    END IF;

    UPDATE public.subscriptions
       SET order_id = v_new_id,
           next_service_date = NULL,
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
$function$;
CREATE OR REPLACE FUNCTION public._ensure_subscription_order_for_occurrence(
  _subscription_id uuid,
  _occurrence_date date,
  _route_id uuid DEFAULT NULL,
  _planned_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_sub public.subscriptions%ROWTYPE;
  v_source_order public.orders%ROWTYPE;
  v_existing_order_id uuid;
  v_new_order_id uuid;
  v_root_order_id uuid;
  v_cycle int;
  v_guard int := 0;
  v_due_at timestamptz;
  v_time time;
  v_has_integration boolean := false;
  v_paused_until timestamptz;
BEGIN
  SELECT * INTO v_sub
  FROM public.subscriptions
  WHERE id = _subscription_id
  FOR UPDATE;

  IF NOT FOUND OR v_sub.status <> 'active' OR _occurrence_date IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_source_order
  FROM public.orders
  WHERE id = v_sub.order_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_root_order_id := COALESCE(v_source_order.parent_order_id, v_source_order.id);

  SELECT o.id INTO v_existing_order_id
  FROM public.orders o
  WHERE (o.id = v_root_order_id OR o.parent_order_id = v_root_order_id)
    AND o.preferred_date = _occurrence_date
    AND o.status <> 'cancelled'
  ORDER BY CASE WHEN o.id = v_root_order_id THEN 0 ELSE 1 END, o.created_at
  LIMIT 1;

  IF v_existing_order_id IS NOT NULL THEN
    UPDATE public.subscriptions
       SET order_id = v_existing_order_id,
           preferred_route_id = COALESCE(preferred_route_id, _route_id),
           updated_at = now()
     WHERE id = _subscription_id;
    RETURN v_existing_order_id;
  END IF;

  v_time := COALESCE(
    v_source_order.preferred_time_start,
    CASE WHEN v_sub.next_service_date IS NOT NULL THEN (v_sub.next_service_date AT TIME ZONE 'Europe/Copenhagen')::time ELSE NULL END,
    time '09:00'
  );
  v_due_at := COALESCE(_planned_at, ((_occurrence_date::timestamp + v_time) AT TIME ZONE 'Europe/Copenhagen'));

  SELECT COALESCE(MAX(o.recurrence_cycle), 0) + 1 INTO v_cycle
  FROM public.orders o
  WHERE o.parent_order_id = v_root_order_id;

  LOOP
    BEGIN
      INSERT INTO public.orders (
        business_id, customer_id, customer_name, customer_email, customer_phone,
        company_name, cvr, address, zip_code, city, latitude, longitude,
        total_amount, status, notes, payment_terms_days,
        preferred_date, preferred_time_start, preferred_time_end,
        estimated_duration_minutes, parent_order_id, recurrence_cycle, next_service_date,
        customer_response, requires_customer_approval, accounting_notes
      ) VALUES (
        v_source_order.business_id, v_source_order.customer_id, v_source_order.customer_name, v_source_order.customer_email, v_source_order.customer_phone,
        v_source_order.company_name, v_source_order.cvr, v_source_order.address, v_source_order.zip_code, v_source_order.city, v_source_order.latitude, v_source_order.longitude,
        v_source_order.total_amount, 'confirmed', v_source_order.notes, v_source_order.payment_terms_days,
        _occurrence_date, v_time, v_source_order.preferred_time_end,
        v_source_order.estimated_duration_minutes, v_root_order_id, v_cycle, NULL,
        COALESCE(v_source_order.customer_response, 'accepted'), false, v_source_order.accounting_notes
      )
      RETURNING id INTO v_new_order_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_cycle := v_cycle + 1;
      v_guard := v_guard + 1;
      IF v_guard > 100 THEN
        RAISE;
      END IF;
    END;
  END LOOP;

  INSERT INTO public.order_items (order_id, service_id, service_name, quantity, unit_price, total_price, details)
  SELECT v_new_order_id, oi.service_id, oi.service_name, oi.quantity, oi.unit_price, oi.total_price, oi.details
  FROM public.order_items oi
  WHERE oi.order_id = v_source_order.id;

  UPDATE public.subscriptions
     SET order_id = v_new_order_id,
         preferred_route_id = COALESCE(preferred_route_id, _route_id),
         updated_at = now()
   WHERE id = _subscription_id;

  SELECT ai.is_active, ai.paused_until
    INTO v_has_integration, v_paused_until
  FROM public.accounting_integrations ai
  WHERE ai.business_id = v_source_order.business_id
  LIMIT 1;

  IF COALESCE(v_has_integration, false) AND (v_paused_until IS NULL OR v_paused_until <= now()) THEN
    INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation, status, scheduled_for)
    VALUES (v_source_order.business_id, 'order', v_new_order_id, 'create', 'pending', now())
    ON CONFLICT DO NOTHING;

    PERFORM public.kick_accounting_sync(v_source_order.business_id);
  END IF;

  RETURN v_new_order_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._ensure_subscription_order_for_occurrence(uuid, date, uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._ensure_subscription_order_for_occurrence(uuid, date, uuid, timestamptz) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public._materialize_subscription_stop_on_route(
  _subscription_id uuid,
  _route_id uuid,
  _occurrence_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_sub public.subscriptions%ROWTYPE;
  v_source_order public.orders%ROWTYPE;
  v_occ_order public.orders%ROWTYPE;
  v_source_stop public.route_stops%ROWTYPE;
  v_existing_stop public.route_stops%ROWTYPE;
  v_completed_snapshot public.employee_completed_stops%ROWTYPE;
  v_sequence int;
  v_planned timestamptz;
  v_employee_id uuid;
  v_service_summary text;
  v_order_id uuid;
  v_has_integration boolean := false;
  v_paused_until timestamptz;
BEGIN
  SELECT * INTO v_sub FROM public.subscriptions WHERE id = _subscription_id;
  IF NOT FOUND OR v_sub.status <> 'active' OR _route_id IS NULL OR _occurrence_date IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_source_order FROM public.orders WHERE id = v_sub.order_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_planned := CASE
    WHEN v_source_order.preferred_time_start IS NOT NULL
      THEN ((_occurrence_date::timestamp + v_source_order.preferred_time_start) AT TIME ZONE 'Europe/Copenhagen')
    WHEN v_sub.next_service_date IS NOT NULL
      THEN ((_occurrence_date::timestamp + (v_sub.next_service_date AT TIME ZONE 'Europe/Copenhagen')::time) AT TIME ZONE 'Europe/Copenhagen')
    ELSE ((_occurrence_date::timestamp + time '09:00') AT TIME ZONE 'Europe/Copenhagen')
  END;

  v_order_id := public._ensure_subscription_order_for_occurrence(_subscription_id, _occurrence_date, _route_id, v_planned);
  IF v_order_id IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_occ_order FROM public.orders WHERE id = v_order_id;

  SELECT * INTO v_source_stop
  FROM public.route_stops rs
  WHERE rs.order_id = v_source_order.id
     OR rs.subscription_id = _subscription_id
  ORDER BY rs.completed_at DESC NULLS LAST, rs.created_at DESC
  LIMIT 1;

  SELECT * INTO v_completed_snapshot
  FROM public.employee_completed_stops ecs
  WHERE ecs.order_id = v_source_order.id
     OR ecs.order_id = v_order_id
     OR (ecs.business_id = v_sub.business_id
         AND ecs.customer_name = COALESCE(v_sub.customer_name, v_occ_order.customer_name, v_source_order.customer_name)
         AND ecs.service_summary = v_sub.service_name)
  ORDER BY ecs.completed_at DESC NULLS LAST, ecs.created_at DESC
  LIMIT 1;

  v_employee_id := COALESCE(v_source_stop.assigned_employee_id, v_completed_snapshot.employee_id, v_occ_order.customer_id);
  v_service_summary := COALESCE(v_source_stop.service_summary, v_completed_snapshot.service_summary, v_sub.service_name);

  SELECT * INTO v_existing_stop
  FROM public.route_stops rs
  WHERE rs.route_id = _route_id
    AND rs.subscription_id = _subscription_id
  ORDER BY CASE WHEN COALESCE(rs.status, 'pending') IN ('completed', 'cancelled') THEN 1 ELSE 0 END,
           rs.sequence,
           rs.created_at
  LIMIT 1;

  IF v_existing_stop.id IS NOT NULL THEN
    UPDATE public.route_stops
       SET order_id = v_order_id,
           planned_arrival = COALESCE(planned_arrival, v_planned),
           customer_name = COALESCE(customer_name, v_occ_order.customer_name, v_source_order.customer_name),
           customer_phone = COALESCE(customer_phone, v_occ_order.customer_phone, v_source_order.customer_phone),
           service_summary = COALESCE(service_summary, v_service_summary),
           updated_at = now()
     WHERE id = v_existing_stop.id;

    IF v_existing_stop.status = 'completed' THEN
      SELECT ai.is_active, ai.paused_until
        INTO v_has_integration, v_paused_until
      FROM public.accounting_integrations ai
      WHERE ai.business_id = v_occ_order.business_id
      LIMIT 1;

      IF COALESCE(v_has_integration, false)
         AND (v_paused_until IS NULL OR v_paused_until <= now())
         AND v_occ_order.invoice_external_id IS NULL THEN
        INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation, status, scheduled_for)
        VALUES (v_occ_order.business_id, 'invoice', v_order_id, 'create', 'pending', now())
        ON CONFLICT DO NOTHING;
        PERFORM public.kick_accounting_sync(v_occ_order.business_id);
      END IF;
    END IF;
    RETURN;
  END IF;

  SELECT COALESCE(MAX(sequence), 0) + 1 INTO v_sequence
  FROM public.route_stops
  WHERE route_id = _route_id;

  INSERT INTO public.route_stops (
    route_id, order_id, subscription_id, agreement_occurrence_id, sequence, planned_arrival, status,
    address, latitude, longitude, customer_name, customer_phone, service_summary,
    duration_minutes, time_window_start, time_window_end, assigned_employee_id, required_staff
  ) VALUES (
    _route_id, v_order_id, v_sub.id, NULL, v_sequence, v_planned, 'pending',
    COALESCE(v_source_stop.address, v_completed_snapshot.address, v_occ_order.address, v_source_order.address),
    COALESCE(v_occ_order.latitude, v_source_order.latitude),
    COALESCE(v_occ_order.longitude, v_source_order.longitude),
    COALESCE(v_sub.customer_name, v_occ_order.customer_name, v_source_order.customer_name),
    COALESCE(v_occ_order.customer_phone, v_source_order.customer_phone),
    v_service_summary,
    COALESCE(v_source_stop.duration_minutes, v_completed_snapshot.duration_minutes, v_occ_order.estimated_duration_minutes, v_source_order.estimated_duration_minutes),
    v_occ_order.preferred_time_start, v_occ_order.preferred_time_end,
    v_employee_id,
    COALESCE(v_source_stop.required_staff, 1)
  ) ON CONFLICT DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._materialize_subscription_stop_on_route(uuid, uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._materialize_subscription_stop_on_route(uuid, uuid, date) TO authenticated, service_role;
-- Helpers for the new agreement occurrence lifecycle
CREATE OR REPLACE FUNCTION public._agreement_interval_duration(
  _interval public.agreement_interval,
  _custom_days integer DEFAULT NULL
)
RETURNS interval
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF _interval = 'engangskøb' THEN
    RETURN NULL;
  ELSIF _interval = 'custom' THEN
    RETURN make_interval(days => GREATEST(COALESCE(_custom_days, 1), 1));
  ELSE
    RETURN public.interval_to_duration(_interval::text);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._agreement_occurs_on_route_date(
  _interval public.agreement_interval,
  _custom_days integer,
  _anchor_date date,
  _target_date date
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_duration interval;
  v_cursor date;
  v_guard int := 0;
BEGIN
  IF _anchor_date IS NULL OR _target_date IS NULL OR _target_date < _anchor_date THEN
    RETURN false;
  END IF;

  v_duration := public._agreement_interval_duration(_interval, _custom_days);
  IF v_duration IS NULL THEN
    RETURN _target_date = _anchor_date;
  END IF;

  v_cursor := _anchor_date;
  WHILE v_cursor < _target_date AND v_guard < 4000 LOOP
    v_cursor := (v_cursor::timestamp + v_duration)::date;
    v_guard := v_guard + 1;
  END LOOP;

  RETURN v_cursor = _target_date;
END;
$$;

CREATE OR REPLACE FUNCTION public._materialize_occurrence_on_route(
  _occurrence_id uuid,
  _route_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_o public.agreement_occurrences%ROWTYPE;
  v_a public.agreements%ROWTYPE;
  v_route public.routes%ROWTYPE;
  v_seq int;
  v_service_summary text;
  v_planned_arrival timestamptz;
  v_lead_employee uuid;
BEGIN
  SELECT * INTO v_o FROM public.agreement_occurrences WHERE id = _occurrence_id;
  IF NOT FOUND OR v_o.status <> 'planned' THEN
    RETURN;
  END IF;

  SELECT * INTO v_route FROM public.routes WHERE id = _route_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT * INTO v_a FROM public.agreements WHERE id = v_o.agreement_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT string_agg(service_name, ', ' ORDER BY created_at)
    INTO v_service_summary
    FROM public.agreement_items
   WHERE agreement_id = v_a.id;

  SELECT COALESCE(MAX(sequence), -1) + 1
    INTO v_seq
    FROM public.route_stops
   WHERE route_id = _route_id;

  v_planned_arrival := v_o.planned_arrival;
  IF v_planned_arrival IS NULL AND v_a.preferred_time_start IS NOT NULL THEN
    v_planned_arrival := ((v_o.occurrence_date::timestamp + v_a.preferred_time_start) AT TIME ZONE 'Europe/Copenhagen');
  END IF;

  v_lead_employee := COALESCE(v_o.employee_ids[1], v_a.employee_ids[1]);

  INSERT INTO public.route_stops (
    route_id, agreement_occurrence_id, sequence, status, planned_arrival,
    address, latitude, longitude, customer_name, customer_phone, service_summary,
    duration_minutes, time_window_start, time_window_end, assigned_employee_id, required_staff, notes
  )
  SELECT
    _route_id, v_o.id, v_seq, 'planned', v_planned_arrival,
    v_a.address, v_a.latitude, v_a.longitude, v_a.customer_name, v_a.customer_phone,
    COALESCE(v_service_summary, 'Aftale'), COALESCE(v_a.estimated_duration_minutes, 30),
    v_a.preferred_time_start, v_a.preferred_time_end, v_lead_employee, 1, v_a.notes
  WHERE NOT EXISTS (
    SELECT 1 FROM public.route_stops rs WHERE rs.agreement_occurrence_id = v_o.id
  );

  UPDATE public.agreement_occurrences
     SET route_id = _route_id,
         planned_arrival = v_planned_arrival,
         employee_ids = CASE
           WHEN COALESCE(array_length(employee_ids, 1), 0) = 0 THEN COALESCE(v_a.employee_ids, '{}'::uuid[])
           ELSE employee_ids
         END,
         updated_at = now()
   WHERE id = v_o.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_next_agreement_occurrence(_completed_occurrence_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_occ public.agreement_occurrences%ROWTYPE;
  v_agreement public.agreements%ROWTYPE;
  v_duration interval;
  v_next_date date;
  v_next_idx int;
  v_next_id uuid;
  v_route_id uuid;
  v_planned_arrival timestamptz;
BEGIN
  SELECT * INTO v_occ
    FROM public.agreement_occurrences
   WHERE id = _completed_occurrence_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_agreement
    FROM public.agreements
   WHERE id = v_occ.agreement_id;
  IF NOT FOUND OR v_agreement.status <> 'active' THEN
    RETURN NULL;
  END IF;

  v_duration := public._agreement_interval_duration(v_agreement.interval, v_agreement.interval_days);
  IF v_duration IS NULL THEN
    RETURN NULL;
  END IF;

  v_next_date := (v_occ.occurrence_date::timestamp + v_duration)::date;
  IF v_agreement.end_date IS NOT NULL AND v_next_date > v_agreement.end_date THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(MAX(sequence_index), -1) + 1
    INTO v_next_idx
    FROM public.agreement_occurrences
   WHERE agreement_id = v_agreement.id;
  v_next_idx := GREATEST(v_next_idx, COALESCE(v_occ.sequence_index, -1) + 1);

  SELECT id INTO v_route_id
    FROM public.routes
   WHERE business_id = v_agreement.business_id
     AND route_date = v_next_date
     AND (
       id = v_agreement.preferred_route_id
       OR base_route_id = v_agreement.preferred_route_id
       OR route_template_id = v_agreement.default_route_template_id
     )
   ORDER BY CASE WHEN base_route_id = v_agreement.preferred_route_id THEN 0 ELSE 1 END, created_at
   LIMIT 1;

  IF v_agreement.preferred_time_start IS NOT NULL THEN
    v_planned_arrival := ((v_next_date::timestamp + v_agreement.preferred_time_start) AT TIME ZONE 'Europe/Copenhagen');
  ELSE
    v_planned_arrival := NULL;
  END IF;

  INSERT INTO public.agreement_occurrences (
    agreement_id, business_id, occurrence_date, sequence_index, status,
    route_id, employee_ids, planned_arrival
  ) VALUES (
    v_agreement.id, v_agreement.business_id, v_next_date, v_next_idx, 'planned',
    v_route_id, COALESCE(v_agreement.employee_ids, '{}'::uuid[]), v_planned_arrival
  )
  ON CONFLICT (agreement_id, occurrence_date) DO UPDATE
    SET route_id = COALESCE(public.agreement_occurrences.route_id, EXCLUDED.route_id),
        planned_arrival = COALESCE(public.agreement_occurrences.planned_arrival, EXCLUDED.planned_arrival),
        employee_ids = CASE
          WHEN COALESCE(array_length(public.agreement_occurrences.employee_ids, 1), 0) = 0 THEN EXCLUDED.employee_ids
          ELSE public.agreement_occurrences.employee_ids
        END,
        updated_at = now()
  RETURNING id INTO v_next_id;

  IF v_route_id IS NOT NULL THEN
    PERFORM public._materialize_occurrence_on_route(v_next_id, v_route_id);
  END IF;

  UPDATE public.subscriptions
     SET next_service_date = (v_next_date::timestamp AT TIME ZONE 'Europe/Copenhagen'),
         preferred_route_id = COALESCE(preferred_route_id, v_agreement.preferred_route_id),
         updated_at = now()
   WHERE id = v_agreement.legacy_subscription_id;

  RETURN v_next_id;
END;
$$;

-- When a route stop is completed, complete the concrete occurrence and create the next one.
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
             completed_cycles = GREATEST(COALESCE(completed_cycles, 0) + 1, COALESCE((SELECT sequence_index + 1 FROM public.agreement_occurrences WHERE id = v_occ_id), 1)),
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

    UPDATE public.subscriptions
       SET preferred_route_id = NEW.route_id,
           next_service_date  = now() + public.interval_to_duration(COALESCE(details->>'interval', interval)),
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

-- Accounting orders for agreement occurrences are created when the occurrence is on a real route.
CREATE OR REPLACE FUNCTION public.enqueue_order_for_new_occurrence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active boolean;
  v_paused timestamptz;
  v_model public.agreement_billing_model;
BEGIN
  IF NEW.status = 'cancelled' THEN RETURN NEW; END IF;
  IF NEW.route_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE'
     AND OLD.route_id IS NOT DISTINCT FROM NEW.route_id
     AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT billing_model INTO v_model FROM public.agreements WHERE id = NEW.agreement_id;
  IF v_model = 'monthly_consolidated' THEN RETURN NEW; END IF;

  SELECT is_active, paused_until INTO v_active, v_paused
  FROM public.accounting_integrations
  WHERE business_id = NEW.business_id LIMIT 1;
  IF NOT COALESCE(v_active, false) THEN RETURN NEW; END IF;
  IF v_paused IS NOT NULL AND v_paused > now() THEN RETURN NEW; END IF;

  INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation)
  VALUES (NEW.business_id, 'agreement_occurrence', NEW.id, 'create_order')
  ON CONFLICT DO NOTHING;

  PERFORM public.kick_accounting_sync(NEW.business_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_order_for_new_occurrence ON public.agreement_occurrences;
CREATE TRIGGER trg_enqueue_order_for_new_occurrence
AFTER INSERT OR UPDATE OF route_id, status ON public.agreement_occurrences
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_order_for_new_occurrence();

-- Occurrence-based stops invoice through agreement_occurrences, not the legacy order trigger.
CREATE OR REPLACE FUNCTION public.enqueue_invoice_on_stop_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_order RECORD;
  v_has_integration boolean;
  v_paused timestamptz;
BEGIN
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN RETURN NEW; END IF;
  IF NEW.agreement_occurrence_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.order_id IS NULL THEN RETURN NEW; END IF;

  SELECT id, business_id, invoice_external_id, total_amount, customer_email
    INTO v_order FROM public.orders WHERE id = NEW.order_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  IF v_order.invoice_external_id IS NOT NULL THEN RETURN NEW; END IF;
  IF v_order.total_amount IS NULL OR v_order.total_amount <= 0 THEN RETURN NEW; END IF;
  IF v_order.customer_email IS NULL OR v_order.customer_email = '' THEN RETURN NEW; END IF;

  SELECT is_active, paused_until INTO v_has_integration, v_paused
    FROM public.accounting_integrations
   WHERE business_id = v_order.business_id LIMIT 1;
  IF NOT COALESCE(v_has_integration, false) THEN RETURN NEW; END IF;
  IF v_paused IS NOT NULL AND v_paused > now() THEN RETURN NEW; END IF;

  INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation)
  VALUES (v_order.business_id, 'invoice', v_order.id, 'create')
  ON CONFLICT DO NOTHING;

  PERFORM public.kick_accounting_sync(v_order.business_id);
  RETURN NEW;
END;
$$;

-- Materialize a projected route into real occurrences/stops for that date.
CREATE OR REPLACE FUNCTION public.materialize_virtual_route(_base_route_id uuid, _date date)
RETURNS routes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_base public.routes;
  v_existing public.routes;
  v_new public.routes;
  v_agreement RECORD;
  v_occ_id uuid;
  v_idx int;
  v_planned_arrival timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Du er ikke logget ind. Log ind igen og prøv på ny.';
  END IF;

  SELECT * INTO v_base FROM public.routes WHERE id = _base_route_id;
  IF v_base.id IS NULL THEN
    RAISE EXCEPTION 'Basisruten findes ikke længere';
  END IF;

  IF NOT (
    public.has_role(v_uid, 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = v_base.business_id AND b.owner_id = v_uid)
  ) THEN
    RAISE EXCEPTION 'Du har ikke rettigheder til denne handling.';
  END IF;

  SELECT * INTO v_existing
  FROM public.routes
  WHERE base_route_id = _base_route_id AND route_date = _date
  LIMIT 1;

  IF v_existing.id IS NULL THEN
    INSERT INTO public.routes (
      business_id, route_date, status, name, color, start_address,
      start_latitude, start_longitude, planned_start_time, start_from_home,
      notes, base_route_id, route_template_id, employee_id
    ) VALUES (
      v_base.business_id, _date, 'planned', v_base.name, v_base.color, v_base.start_address,
      v_base.start_latitude, v_base.start_longitude, v_base.planned_start_time, COALESCE(v_base.start_from_home, false),
      v_base.notes, _base_route_id, v_base.route_template_id, v_base.employee_id
    )
    ON CONFLICT (base_route_id, route_date) DO NOTHING
    RETURNING * INTO v_new;

    IF v_new.id IS NULL THEN
      SELECT * INTO v_new
      FROM public.routes
      WHERE base_route_id = _base_route_id AND route_date = _date
      LIMIT 1;
    END IF;

    INSERT INTO public.route_employees (route_id, employee_id)
    SELECT v_new.id, re.employee_id
      FROM public.route_employees re
     WHERE re.route_id = _base_route_id
    ON CONFLICT DO NOTHING;

    IF v_base.employee_id IS NOT NULL THEN
      INSERT INTO public.route_employees (route_id, employee_id)
      VALUES (v_new.id, v_base.employee_id)
      ON CONFLICT DO NOTHING;
    END IF;
  ELSE
    v_new := v_existing;
  END IF;

  FOR v_agreement IN
    SELECT a.*
      FROM public.agreements a
     WHERE a.business_id = v_base.business_id
       AND a.status = 'active'
       AND a.interval <> 'engangskøb'
       AND a.preferred_route_id = _base_route_id
       AND a.start_date <= _date
       AND (a.end_date IS NULL OR a.end_date >= _date)
       AND public._agreement_occurs_on_route_date(a.interval, a.interval_days, v_base.route_date, _date)
  LOOP
    SELECT COALESCE(MAX(sequence_index), -1) + 1
      INTO v_idx
      FROM public.agreement_occurrences
     WHERE agreement_id = v_agreement.id;

    IF v_agreement.preferred_time_start IS NOT NULL THEN
      v_planned_arrival := ((_date::timestamp + v_agreement.preferred_time_start) AT TIME ZONE 'Europe/Copenhagen');
    ELSE
      v_planned_arrival := NULL;
    END IF;

    INSERT INTO public.agreement_occurrences (
      agreement_id, business_id, occurrence_date, sequence_index, status,
      route_id, employee_ids, planned_arrival
    ) VALUES (
      v_agreement.id, v_agreement.business_id, _date, v_idx, 'planned',
      v_new.id, COALESCE(v_agreement.employee_ids, '{}'::uuid[]), v_planned_arrival
    )
    ON CONFLICT (agreement_id, occurrence_date) DO UPDATE
      SET route_id = COALESCE(public.agreement_occurrences.route_id, EXCLUDED.route_id),
          planned_arrival = COALESCE(public.agreement_occurrences.planned_arrival, EXCLUDED.planned_arrival),
          employee_ids = CASE
            WHEN COALESCE(array_length(public.agreement_occurrences.employee_ids, 1), 0) = 0 THEN EXCLUDED.employee_ids
            ELSE public.agreement_occurrences.employee_ids
          END,
          updated_at = now()
    RETURNING id INTO v_occ_id;

    PERFORM public._materialize_occurrence_on_route(v_occ_id, v_new.id);
  END LOOP;

  INSERT INTO public.route_occurrence_exceptions (
    business_id, base_route_id, occurrence_date, replacement_route_id, exception_type
  ) VALUES (
    v_base.business_id, _base_route_id, _date, v_new.id, 'moved'
  )
  ON CONFLICT (base_route_id, occurrence_date) DO UPDATE
    SET replacement_route_id = EXCLUDED.replacement_route_id,
        exception_type = EXCLUDED.exception_type;

  RETURN v_new;
END;
$$;
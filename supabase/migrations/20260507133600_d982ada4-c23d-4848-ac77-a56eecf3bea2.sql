-- 1) Funktion: auto-opret subscriptions fra order_items når interval er sat
CREATE OR REPLACE FUNCTION public.auto_create_subscriptions_from_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item RECORD;
  v_interval text;
  v_status text;
BEGIN
  -- Kun for ordrer der ikke er annullerede
  IF NEW.status = 'cancelled' THEN RETURN NEW; END IF;

  FOR v_item IN
    SELECT id, service_id, service_name, total_price, details
    FROM public.order_items
    WHERE order_id = NEW.id
  LOOP
    v_interval := COALESCE(v_item.details->>'interval', NULL);
    IF v_interval IS NULL OR v_interval = 'engangskøb' THEN CONTINUE; END IF;

    -- Spring over hvis der allerede er en subscription for denne service+order
    IF EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.order_id = NEW.id
        AND COALESCE(s.service_id::text, '') = COALESCE(v_item.service_id::text, '')
    ) THEN CONTINUE; END IF;

    -- Status: pending hvis ordren kræver kunde-godkendelse, ellers active
    v_status := CASE
      WHEN NEW.status IN ('pending') AND COALESCE(NEW.requires_customer_approval, false) THEN 'pending'
      ELSE 'active'
    END;

    INSERT INTO public.subscriptions (
      business_id, customer_id, service_id, order_id,
      service_name, interval, status, details, total_price
    ) VALUES (
      NEW.business_id, NEW.customer_id, v_item.service_id, NEW.id,
      v_item.service_name, v_interval, v_status, v_item.details, v_item.total_price
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_subscriptions ON public.orders;
CREATE TRIGGER trg_auto_create_subscriptions
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.auto_create_subscriptions_from_order();

-- Kør også når order_items først indsættes (typisk i samme tx som ordren)
CREATE OR REPLACE FUNCTION public.auto_create_subscription_from_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_interval text;
  v_status text;
BEGIN
  v_interval := COALESCE(NEW.details->>'interval', NULL);
  IF v_interval IS NULL OR v_interval = 'engangskøb' THEN RETURN NEW; END IF;

  SELECT id, business_id, customer_id, status, requires_customer_approval
    INTO v_order FROM public.orders WHERE id = NEW.order_id;
  IF NOT FOUND OR v_order.status = 'cancelled' THEN RETURN NEW; END IF;

  IF EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.order_id = NEW.order_id
      AND COALESCE(s.service_id::text, '') = COALESCE(NEW.service_id::text, '')
  ) THEN RETURN NEW; END IF;

  v_status := CASE
    WHEN v_order.status = 'pending' AND COALESCE(v_order.requires_customer_approval, false) THEN 'pending'
    ELSE 'active'
  END;

  INSERT INTO public.subscriptions (
    business_id, customer_id, service_id, order_id,
    service_name, interval, status, details, total_price
  ) VALUES (
    v_order.business_id, v_order.customer_id, NEW.service_id, NEW.order_id,
    NEW.service_name, v_interval, v_status, NEW.details, NEW.total_price
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_subscription_from_item ON public.order_items;
CREATE TRIGGER trg_auto_create_subscription_from_item
AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.auto_create_subscription_from_item();

-- 2) Udvid handle_route_stop_completion til fallback via order_items.details->>interval
CREATE OR REPLACE FUNCTION public.handle_route_stop_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_order_id uuid;
  v_sub RECORD;
  v_next_at timestamptz;
  v_new_order_id uuid;
  v_old_order RECORD;
  v_new_stop_id uuid;
  v_route_id uuid;
  v_route_date date;
  v_assignee RECORD;
  v_accounting_active boolean;
  v_has_subs boolean;
BEGIN
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN RETURN NEW; END IF;

  v_order_id := NEW.order_id;
  IF v_order_id IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO v_old_order FROM public.orders WHERE id = v_order_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  UPDATE public.orders
     SET status = 'completed',
         completed_cycles = COALESCE(completed_cycles, 0) + 1,
         updated_at = now()
   WHERE id = v_order_id;

  -- a) Bog faktura hvis aktiv regnskabsintegration
  SELECT EXISTS (
    SELECT 1 FROM public.accounting_integrations ai
     WHERE ai.business_id = v_old_order.business_id AND ai.is_active = true
  ) INTO v_accounting_active;

  IF v_accounting_active THEN
    INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation)
    VALUES (v_old_order.business_id, 'invoice', v_order_id, 'book')
    ON CONFLICT DO NOTHING;
  END IF;

  -- b) Self-healing: Hvis der ikke findes aktive subscriptions men order_items har interval,
  -- så opret subscription nu (auto-fix for gamle ordrer der manglede subscription)
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions WHERE order_id = v_order_id AND status = 'active'
  ) INTO v_has_subs;

  IF NOT v_has_subs THEN
    INSERT INTO public.subscriptions (
      business_id, customer_id, service_id, order_id,
      service_name, interval, status, details, total_price
    )
    SELECT v_old_order.business_id, v_old_order.customer_id, oi.service_id, v_order_id,
           oi.service_name, oi.details->>'interval', 'active', oi.details, oi.total_price
      FROM public.order_items oi
     WHERE oi.order_id = v_order_id
       AND oi.details->>'interval' IS NOT NULL
       AND oi.details->>'interval' <> 'engangskøb'
       AND NOT EXISTS (
         SELECT 1 FROM public.subscriptions s
         WHERE s.order_id = v_order_id
           AND COALESCE(s.service_id::text,'') = COALESCE(oi.service_id::text,'')
       );
  END IF;

  -- c) Generér næste ordre + rute-stop for hvert aktivt abonnement
  FOR v_sub IN
    SELECT id, service_id, service_name, total_price, interval, details
      FROM public.subscriptions
     WHERE order_id = v_order_id
       AND status = 'active'
       AND interval IS NOT NULL
       AND interval <> 'engangskøb'
  LOOP
    v_next_at := now() + CASE v_sub.interval
                WHEN '10_min'      THEN interval '10 minutes'
                WHEN 'daglig'      THEN interval '1 day'
                WHEN 'ugentlig'    THEN interval '7 days'
                WHEN 'hver_14_dag' THEN interval '14 days'
                WHEN 'månedlig'    THEN interval '30 days'
                WHEN 'hver_4_uge'  THEN interval '28 days'
                WHEN 'hver_8_uge'  THEN interval '56 days'
                WHEN 'kvartalsvis' THEN interval '90 days'
                WHEN 'halvårlig'   THEN interval '180 days'
                WHEN 'årlig'       THEN interval '365 days'
                ELSE interval '30 days'
              END;

    INSERT INTO public.orders (
      business_id, customer_id, customer_name, customer_email, customer_phone,
      address, city, zip_code, latitude, longitude,
      status, total_amount, notes, parent_order_id, next_service_date
    )
    VALUES (
      v_old_order.business_id, v_old_order.customer_id, v_old_order.customer_name,
      v_old_order.customer_email, v_old_order.customer_phone,
      v_old_order.address, v_old_order.city, v_old_order.zip_code,
      v_old_order.latitude, v_old_order.longitude,
      'confirmed', v_sub.total_price,
      'Auto-genereret fra abonnement (' || v_sub.interval || ')',
      v_order_id, v_next_at
    )
    RETURNING id INTO v_new_order_id;

    INSERT INTO public.order_items (order_id, service_id, service_name, quantity, unit_price, total_price, details)
    VALUES (v_new_order_id, v_sub.service_id, v_sub.service_name, 1, v_sub.total_price, v_sub.total_price, v_sub.details);

    UPDATE public.subscriptions
       SET order_id = v_new_order_id,
           next_service_date = v_next_at,
           updated_at = now()
     WHERE id = v_sub.id;

    SELECT r.id, r.route_date INTO v_route_id, v_route_date
      FROM public.routes r
      JOIN public.route_stops rs ON rs.route_id = r.id
     WHERE rs.id = NEW.id;

    IF v_route_date IS NULL OR v_route_date <> v_next_at::date THEN
      SELECT r.id INTO v_route_id
        FROM public.routes r
       WHERE r.business_id = v_old_order.business_id
         AND r.route_date = v_next_at::date
         AND r.employee_id IS NOT DISTINCT FROM (
           SELECT employee_id FROM public.routes WHERE id = (
             SELECT route_id FROM public.route_stops WHERE id = NEW.id
           )
         )
       LIMIT 1;
      IF v_route_id IS NULL THEN
        INSERT INTO public.routes (business_id, employee_id, route_date, status, notes)
        SELECT v_old_order.business_id, r.employee_id, v_next_at::date, 'planned',
               'Auto-genereret fra abonnement'
          FROM public.routes r
         WHERE r.id = (SELECT route_id FROM public.route_stops WHERE id = NEW.id)
        RETURNING id INTO v_route_id;
      END IF;
    END IF;

    INSERT INTO public.route_stops (
      route_id, order_id, subscription_id, sequence, planned_arrival, status,
      address, latitude, longitude, customer_name, customer_phone, service_summary,
      assigned_employee_id
    )
    SELECT v_route_id, v_new_order_id, v_sub.id,
           COALESCE((SELECT MAX(sequence)+1 FROM public.route_stops WHERE route_id = v_route_id), 0),
           v_next_at, 'pending',
           v_old_order.address, v_old_order.latitude, v_old_order.longitude,
           v_old_order.customer_name, v_old_order.customer_phone, v_sub.service_name,
           rs_old.assigned_employee_id
      FROM public.route_stops rs_old
     WHERE rs_old.id = NEW.id
    RETURNING id INTO v_new_stop_id;

    IF v_new_stop_id IS NOT NULL THEN
      INSERT INTO public.route_stop_assignees (stop_id, employee_id, is_lead)
      SELECT v_new_stop_id, a.employee_id, a.is_lead
        FROM public.route_stop_assignees a
       WHERE a.stop_id = NEW.id
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;
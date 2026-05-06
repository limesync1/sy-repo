-- Gruppe D – auto-flow ordre→faktura→næste rute-stop med samme medarbejder

-- 1) Felter på orders til at spore faktura-tilstand
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS invoice_status text,
  ADD COLUMN IF NOT EXISTS invoiced_at timestamptz,
  ADD COLUMN IF NOT EXISTS invoice_external_id text;

-- 2) Tillad 'invoice' som entity_type i sync-køen (constraint kan være implicit – vi
--    forsøger først at finde en eksisterende CHECK og udvide den, ellers gør vi intet).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'public.accounting_sync_queue'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%entity_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.accounting_sync_queue DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.accounting_sync_queue
  ADD CONSTRAINT accounting_sync_queue_entity_type_chk
    CHECK (entity_type IN ('customer','product','order','invoice'));

-- 3) Erstat handle_route_stop_completion så den både:
--    a) opretter den næste ordre + route_stop på samme rute med samme medarbejder
--    b) køer en 'invoice' job for den lige udførte ordre
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

  SELECT * INTO v_old_order FROM public.orders WHERE id = v_order_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  UPDATE public.orders
     SET status = 'completed',
         completed_cycles = COALESCE(completed_cycles, 0) + 1,
         updated_at = now()
   WHERE id = v_order_id;

  -- a) Køer en invoice-job hvis virksomheden har aktiv regnskabsintegration.
  SELECT EXISTS (
    SELECT 1 FROM public.accounting_integrations ai
     WHERE ai.business_id = v_old_order.business_id AND ai.is_active = true
  ) INTO v_accounting_active;

  IF v_accounting_active THEN
    INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation)
    VALUES (v_old_order.business_id, 'invoice', v_order_id, 'book')
    ON CONFLICT DO NOTHING;
  END IF;

  -- b) Generér næste ordre + rute-stop for hvert aktivt abonnement
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

    -- Opret nyt route_stop på SAMME rute med SAMME medarbejder.
    -- Vi finder den rute som det udførte stop ligger på.
    SELECT r.id, r.route_date INTO v_route_id, v_route_date
      FROM public.routes r
      JOIN public.route_stops rs ON rs.route_id = r.id
     WHERE rs.id = NEW.id;

    -- Hvis næste service ligger en anden dag → find/opret rute for samme medarbejder den dag
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

    -- Kopier evt. ekstra holdmedlemmer (route_stop_assignees) over på det nye stop
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

-- 4) Index for hurtigere opslag på invoice-jobs
CREATE INDEX IF NOT EXISTS idx_sync_queue_invoice
  ON public.accounting_sync_queue(business_id, status)
  WHERE entity_type = 'invoice';
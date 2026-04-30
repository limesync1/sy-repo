-- 1. Payment status fields on orders (sourced ONLY from accounting provider)
DO $$ BEGIN
  CREATE TYPE public.order_payment_status AS ENUM ('unpaid','partially_paid','paid','credited','overdue');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status public.order_payment_status,
  ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS paid_amount numeric,
  ADD COLUMN IF NOT EXISTS payment_status_synced_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS due_date date;

CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_next_service_due ON public.orders(next_service_date)
  WHERE next_service_date IS NOT NULL AND status IN ('confirmed','completed');

-- 2. Forbid clients from writing payment_status / paid_at / paid_amount.
-- These columns are sourced ONLY from the accounting provider.
CREATE OR REPLACE FUNCTION public.prevent_client_payment_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
BEGIN
  -- Service role (cron / accounting-sync edge function) must always be allowed
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR auth.role() = 'service_role'
     OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.payment_status := NULL;
    NEW.paid_at := NULL;
    NEW.paid_amount := NULL;
    NEW.payment_status_synced_at := NULL;
    RETURN NEW;
  END IF;

  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    NEW.payment_status := OLD.payment_status;
  END IF;
  IF NEW.paid_at IS DISTINCT FROM OLD.paid_at THEN
    NEW.paid_at := OLD.paid_at;
  END IF;
  IF NEW.paid_amount IS DISTINCT FROM OLD.paid_amount THEN
    NEW.paid_amount := OLD.paid_amount;
  END IF;
  IF NEW.payment_status_synced_at IS DISTINCT FROM OLD.payment_status_synced_at THEN
    NEW.payment_status_synced_at := OLD.payment_status_synced_at;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_orders_prevent_client_payment_writes ON public.orders;
CREATE TRIGGER trg_orders_prevent_client_payment_writes
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.prevent_client_payment_writes();

-- 3. Track recurrence parent + cycle to prevent duplicate auto-creation
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS recurrence_cycle integer;

CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_parent_cycle
  ON public.orders(parent_order_id, recurrence_cycle)
  WHERE parent_order_id IS NOT NULL AND recurrence_cycle IS NOT NULL;

-- 4. Auto-recur function: clones due recurring orders into new pending orders
CREATE OR REPLACE FUNCTION public.auto_recur_due_orders()
RETURNS TABLE(created_order_id uuid, source_order_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  r record;
  v_new_id uuid;
  v_interval text;
  v_days int;
  v_cycle int;
  v_root uuid;
BEGIN
  FOR r IN
    SELECT o.*
      FROM public.orders o
     WHERE o.next_service_date IS NOT NULL
       AND o.next_service_date <= now()
       AND o.status IN ('confirmed','completed')
       AND EXISTS (
         SELECT 1 FROM public.order_items oi
          WHERE oi.order_id = o.id
            AND (oi.details->>'interval') IS NOT NULL
            AND (oi.details->>'interval') <> 'engangskøb'
       )
  LOOP
    v_root  := COALESCE(r.parent_order_id, r.id);
    v_cycle := COALESCE(r.completed_cycles, 0) + 1;

    -- Skip if a child for this cycle already exists (idempotent)
    IF EXISTS (
      SELECT 1 FROM public.orders
       WHERE parent_order_id = v_root AND recurrence_cycle = v_cycle
    ) THEN
      -- Roll the source order forward so we don't loop forever
      SELECT (oi.details->>'interval') INTO v_interval
        FROM public.order_items oi WHERE oi.order_id = r.id
         AND (oi.details->>'interval') IS NOT NULL
         AND (oi.details->>'interval') <> 'engangskøb' LIMIT 1;
      v_days := CASE v_interval
        WHEN 'ugentlig' THEN 7 WHEN 'hver_14_dag' THEN 14
        WHEN 'månedlig' THEN 30 WHEN 'kvartalsvis' THEN 90
        WHEN 'halvårlig' THEN 180 WHEN 'årlig' THEN 365 ELSE 30 END;
      UPDATE public.orders SET next_service_date = now() + (v_days || ' days')::interval
       WHERE id = r.id;
      CONTINUE;
    END IF;

    SELECT (oi.details->>'interval') INTO v_interval
      FROM public.order_items oi WHERE oi.order_id = r.id
       AND (oi.details->>'interval') IS NOT NULL
       AND (oi.details->>'interval') <> 'engangskøb' LIMIT 1;
    v_days := CASE v_interval
      WHEN 'ugentlig' THEN 7 WHEN 'hver_14_dag' THEN 14
      WHEN 'månedlig' THEN 30 WHEN 'kvartalsvis' THEN 90
      WHEN 'halvårlig' THEN 180 WHEN 'årlig' THEN 365 ELSE 30 END;

    -- Clone order
    INSERT INTO public.orders (
      business_id, customer_id, customer_name, customer_email, customer_phone,
      company_name, cvr, address, zip_code, city, latitude, longitude,
      total_amount, status, notes, payment_terms_days,
      preferred_date, preferred_time_start, preferred_time_end,
      estimated_duration_minutes, parent_order_id, recurrence_cycle,
      next_service_date
    ) VALUES (
      r.business_id, r.customer_id, r.customer_name, r.customer_email, r.customer_phone,
      r.company_name, r.cvr, r.address, r.zip_code, r.city, r.latitude, r.longitude,
      r.total_amount, 'pending', r.notes, r.payment_terms_days,
      CURRENT_DATE, r.preferred_time_start, r.preferred_time_end,
      r.estimated_duration_minutes, v_root, v_cycle,
      now() + (v_days || ' days')::interval
    ) RETURNING id INTO v_new_id;

    -- Clone items
    INSERT INTO public.order_items (order_id, service_id, service_name, quantity, unit_price, total_price, details)
    SELECT v_new_id, oi.service_id, oi.service_name, oi.quantity, oi.unit_price, oi.total_price, oi.details
      FROM public.order_items oi WHERE oi.order_id = r.id;

    -- Push new order's source forward so it doesn't fire again immediately
    UPDATE public.orders
       SET next_service_date = now() + (v_days || ' days')::interval,
           completed_cycles  = v_cycle,
           updated_at = now()
     WHERE id = r.id;

    -- Queue the freshly created order for accounting push (trigger on orders should catch this,
    -- but enqueue defensively to be sure even if triggers are disabled in some envs)
    INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation)
    SELECT r.business_id, 'order', v_new_id, 'upsert'
    WHERE EXISTS (
      SELECT 1 FROM public.accounting_integrations ai
       WHERE ai.business_id = r.business_id AND ai.is_active = true
    )
    ON CONFLICT DO NOTHING;

    created_order_id := v_new_id;
    source_order_id  := r.id;
    RETURN NEXT;
  END LOOP;
END;
$fn$;

REVOKE ALL ON FUNCTION public.auto_recur_due_orders() FROM public;
GRANT EXECUTE ON FUNCTION public.auto_recur_due_orders() TO service_role;
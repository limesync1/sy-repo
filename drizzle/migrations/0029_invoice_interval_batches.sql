
-- Fakturainterval: samlet faktura pr. kunde pr. periode
DO $$ BEGIN
  CREATE TYPE public.invoice_interval AS ENUM ('per_visit','every_14_days','monthly','quarterly','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.accounting_integrations
  ADD COLUMN IF NOT EXISTS invoice_interval public.invoice_interval NOT NULL DEFAULT 'per_visit',
  ADD COLUMN IF NOT EXISTS invoice_interval_count integer,
  ADD COLUMN IF NOT EXISTS invoice_interval_unit text;
ALTER TABLE public.business_customers
  ADD COLUMN IF NOT EXISTS invoice_interval public.invoice_interval,
  ADD COLUMN IF NOT EXISTS invoice_interval_count integer,
  ADD COLUMN IF NOT EXISTS invoice_interval_unit text;
ALTER TABLE public.private_customers
  ADD COLUMN IF NOT EXISTS invoice_interval public.invoice_interval,
  ADD COLUMN IF NOT EXISTS invoice_interval_count integer,
  ADD COLUMN IF NOT EXISTS invoice_interval_unit text;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS invoice_interval public.invoice_interval,
  ADD COLUMN IF NOT EXISTS invoice_interval_count integer,
  ADD COLUMN IF NOT EXISTS invoice_interval_unit text,
  ADD COLUMN IF NOT EXISTS invoice_batch_id uuid;

CREATE TABLE IF NOT EXISTS public.invoice_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_key text NOT NULL,
  customer_name text,
  customer_email text,
  scope_order_id uuid,
  invoice_interval public.invoice_interval NOT NULL,
  interval_count integer,
  interval_unit text,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'open',
  external_id text,
  external_number text,
  last_error text,
  closed_at timestamptz,
  invoiced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.invoice_batch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.invoice_batches(id) ON DELETE CASCADE,
  business_id uuid NOT NULL,
  order_id uuid NOT NULL,
  amount numeric,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);
GRANT SELECT, UPDATE ON public.invoice_batches TO authenticated;
GRANT SELECT, DELETE ON public.invoice_batch_items TO authenticated;
GRANT ALL ON public.invoice_batches TO service_role;
GRANT ALL ON public.invoice_batch_items TO service_role;
ALTER TABLE public.invoice_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_batch_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS invoice_batches_open_idx ON public.invoice_batches (business_id, customer_key, status);
CREATE INDEX IF NOT EXISTS invoice_batch_items_batch_idx ON public.invoice_batch_items (batch_id);

CREATE POLICY "Owners read invoice batches" ON public.invoice_batches FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()));
CREATE POLICY "Owners read invoice batch items" ON public.invoice_batch_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()));
CREATE POLICY "Owners remove open batch items" ON public.invoice_batch_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
     AND EXISTS (SELECT 1 FROM public.invoice_batches ib WHERE ib.id = batch_id AND ib.status = 'open'));

-- Periodeslut ud fra interval
CREATE OR REPLACE FUNCTION public.invoice_period_end(_start date, _iv public.invoice_interval, _count integer, _unit text)
RETURNS date LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _iv
    WHEN 'monthly' THEN (date_trunc('month', _start) + interval '1 month - 1 day')::date
    WHEN 'quarterly' THEN (date_trunc('quarter', _start) + interval '3 months - 1 day')::date
    WHEN 'every_14_days' THEN _start + 13
    WHEN 'custom' THEN (CASE COALESCE(_unit,'day')
        WHEN 'week' THEN _start + (GREATEST(COALESCE(_count,1),1) * 7) - 1
        WHEN 'month' THEN (_start + make_interval(months => GREATEST(COALESCE(_count,1),1)) - interval '1 day')::date
        ELSE _start + GREATEST(COALESCE(_count,1),1) - 1 END)
    ELSE _start END
$$;

-- Effektivt interval for en ordre: aftale > kunde > virksomhed
CREATE OR REPLACE FUNCTION public.resolve_invoice_interval(_order_id uuid)
RETURNS TABLE(iv public.invoice_interval, cnt integer, unit text, source text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE o record; c record; ai record;
BEGIN
  SELECT id, business_id, lower(customer_email) AS email, invoice_interval, invoice_interval_count, invoice_interval_unit
    INTO o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN RETURN QUERY SELECT 'per_visit'::public.invoice_interval, NULL::int, NULL::text, 'default'; RETURN; END IF;
  IF o.invoice_interval IS NOT NULL THEN
    RETURN QUERY SELECT o.invoice_interval, o.invoice_interval_count, o.invoice_interval_unit, 'order'; RETURN;
  END IF;
  IF o.email IS NOT NULL THEN
    SELECT invoice_interval, invoice_interval_count, invoice_interval_unit INTO c
      FROM (SELECT invoice_interval, invoice_interval_count, invoice_interval_unit FROM public.business_customers
             WHERE business_id = o.business_id AND lower(email) = o.email AND invoice_interval IS NOT NULL
            UNION ALL
            SELECT invoice_interval, invoice_interval_count, invoice_interval_unit FROM public.private_customers
             WHERE business_id = o.business_id AND lower(email) = o.email AND invoice_interval IS NOT NULL) x LIMIT 1;
    IF c.invoice_interval IS NOT NULL THEN
      RETURN QUERY SELECT c.invoice_interval, c.invoice_interval_count, c.invoice_interval_unit, 'customer'; RETURN;
    END IF;
  END IF;
  SELECT invoice_interval, invoice_interval_count, invoice_interval_unit INTO ai
    FROM public.accounting_integrations WHERE business_id = o.business_id LIMIT 1;
  RETURN QUERY SELECT COALESCE(ai.invoice_interval,'per_visit'::public.invoice_interval), ai.invoice_interval_count, ai.invoice_interval_unit, 'business';
END $$;
GRANT EXECUTE ON FUNCTION public.resolve_invoice_interval(uuid) TO authenticated, service_role;

-- Læg ordre i kundens åbne samlede faktura
CREATE OR REPLACE FUNCTION public.add_order_to_invoice_batch(_order_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o record; r record; v_key text; v_scope uuid; v_batch uuid; v_today date := (now() AT TIME ZONE 'Europe/Copenhagen')::date;
BEGIN
  SELECT id, business_id, customer_name, customer_email, total_amount, invoice_batch_id INTO o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF o.invoice_batch_id IS NOT NULL THEN RETURN o.invoice_batch_id; END IF;
  SELECT * INTO r FROM public.resolve_invoice_interval(_order_id);
  IF r.iv = 'per_visit' THEN RETURN NULL; END IF;
  v_key := COALESCE(lower(o.customer_email), 'navn:' || lower(COALESCE(o.customer_name,'')));
  v_scope := CASE WHEN r.source = 'order' THEN o.id ELSE NULL END;
  SELECT id INTO v_batch FROM public.invoice_batches
   WHERE business_id = o.business_id AND customer_key = v_key AND status = 'open'
     AND scope_order_id IS NOT DISTINCT FROM v_scope
     AND invoice_interval = r.iv AND interval_count IS NOT DISTINCT FROM r.cnt AND interval_unit IS NOT DISTINCT FROM r.unit
   ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF v_batch IS NULL THEN
    INSERT INTO public.invoice_batches (business_id, customer_key, customer_name, customer_email, scope_order_id, invoice_interval, interval_count, interval_unit, period_start, period_end)
    VALUES (o.business_id, v_key, o.customer_name, o.customer_email, v_scope, r.iv, r.cnt, r.unit, v_today, public.invoice_period_end(v_today, r.iv, r.cnt, r.unit))
    RETURNING id INTO v_batch;
  END IF;
  INSERT INTO public.invoice_batch_items (batch_id, business_id, order_id, amount)
  VALUES (v_batch, o.business_id, o.id, o.total_amount) ON CONFLICT (order_id) DO NOTHING;
  UPDATE public.orders SET invoice_batch_id = v_batch WHERE id = o.id;
  UPDATE public.invoice_batches SET updated_at = now() WHERE id = v_batch;
  RETURN v_batch;
END $$;
REVOKE ALL ON FUNCTION public.add_order_to_invoice_batch(uuid) FROM PUBLIC, anon, authenticated;

-- Fælles indgang: alle fakturajob for ordrer passerer her
CREATE OR REPLACE FUNCTION public.route_invoice_job_to_batch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_batch uuid; v_iv public.invoice_interval;
BEGIN
  IF NEW.entity_type = 'invoice' AND NEW.operation IN ('create','book') THEN
    SELECT iv INTO v_iv FROM public.resolve_invoice_interval(NEW.entity_id);
    IF v_iv IS NOT NULL AND v_iv <> 'per_visit' THEN
      v_batch := public.add_order_to_invoice_batch(NEW.entity_id);
      IF v_batch IS NOT NULL THEN RETURN NULL; END IF;
    END IF;
  ELSIF NEW.entity_type = 'order' AND NEW.operation IN ('create','update') THEN
    -- Ordrer på samlet faktura sendes ikke som separate kladder
    IF EXISTS (SELECT 1 FROM public.orders WHERE id = NEW.entity_id AND invoice_batch_id IS NOT NULL) THEN RETURN NULL; END IF;
    SELECT iv INTO v_iv FROM public.resolve_invoice_interval(NEW.entity_id);
    IF v_iv IS NOT NULL AND v_iv <> 'per_visit' THEN RETURN NULL; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_route_invoice_job_to_batch ON public.accounting_sync_queue;
CREATE TRIGGER trg_route_invoice_job_to_batch BEFORE INSERT ON public.accounting_sync_queue
  FOR EACH ROW EXECUTE FUNCTION public.route_invoice_job_to_batch();

-- Annulleret ordre før fakturering fjernes fra åben samlet faktura
CREATE OR REPLACE FUNCTION public.remove_cancelled_order_from_batch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' AND NEW.invoice_batch_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.invoice_batches WHERE id = NEW.invoice_batch_id AND status = 'open') THEN
      DELETE FROM public.invoice_batch_items WHERE order_id = NEW.id;
      NEW.invoice_batch_id := NULL;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_remove_cancelled_order_from_batch ON public.orders;
CREATE TRIGGER trg_remove_cancelled_order_from_batch BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.remove_cancelled_order_from_batch();

-- Luk forfaldne (eller én bestemt) samlet faktura og sæt den i kø
CREATE OR REPLACE FUNCTION public.close_due_invoice_batches(_batch_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b record; n integer := 0; v_today date := (now() AT TIME ZONE 'Europe/Copenhagen')::date;
BEGIN
  FOR b IN SELECT ib.* FROM public.invoice_batches ib
    WHERE ib.status = 'open'
      AND (CASE WHEN _batch_id IS NULL THEN ib.period_end < v_today ELSE ib.id = _batch_id END)
    FOR UPDATE SKIP LOCKED
  LOOP
    IF _batch_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.businesses bz WHERE bz.id = b.business_id AND bz.owner_id = auth.uid()
    ) AND auth.role() <> 'service_role' AND auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'Ingen adgang';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.invoice_batch_items WHERE batch_id = b.id) THEN
      DELETE FROM public.invoice_batches WHERE id = b.id; CONTINUE;
    END IF;
    UPDATE public.invoice_batches SET status = 'queued', closed_at = now(), updated_at = now() WHERE id = b.id;
    INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation, status, scheduled_for)
    VALUES (b.business_id, 'invoice_batch', b.id, 'book', 'pending', now());
    BEGIN PERFORM public.kick_accounting_sync(b.business_id); EXCEPTION WHEN OTHERS THEN NULL; END;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.close_due_invoice_batches(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_due_invoice_batches(uuid) TO authenticated, service_role;

UPDATE public.accounting_integrations SET invoice_interval = invoice_interval WHERE false;

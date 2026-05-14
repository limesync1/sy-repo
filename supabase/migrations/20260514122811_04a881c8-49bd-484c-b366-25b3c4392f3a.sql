-- E-conomic skal arbejde med fakturakladder, ikke ordrekladder, så posterne findes under Invoices/Fakturaer.
UPDATE public.accounting_integrations
SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object('send_order_as', 'invoice_draft')
WHERE provider = 'economic';

-- Når en almindelig ordre allerede er eller bliver completed, skal den også i fakturakøen.
-- Den gamle trigger dækkede kun route_stops, hvilket gjorde direkte/manuelle færdige ordrer usynlige på Invoices.
CREATE OR REPLACE FUNCTION public.enqueue_invoice_for_completed_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_active boolean;
  v_paused timestamptz;
BEGIN
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN RETURN NEW; END IF;
  IF NEW.invoice_external_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.total_amount IS NULL OR NEW.total_amount <= 0 THEN RETURN NEW; END IF;
  IF NEW.customer_email IS NULL OR NEW.customer_email = '' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.notes, '') ILIKE 'Auto-importeret fra %' THEN RETURN NEW; END IF;

  SELECT is_active, paused_until INTO v_active, v_paused
  FROM public.accounting_integrations
  WHERE business_id = NEW.business_id
  LIMIT 1;

  IF NOT COALESCE(v_active, false) THEN RETURN NEW; END IF;
  IF v_paused IS NOT NULL AND v_paused > now() THEN RETURN NEW; END IF;

  INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation)
  VALUES (NEW.business_id, 'invoice', NEW.id, 'create')
  ON CONFLICT DO NOTHING;

  PERFORM public.kick_accounting_sync(NEW.business_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_invoice_for_completed_order ON public.orders;
CREATE TRIGGER trg_enqueue_invoice_for_completed_order
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_invoice_for_completed_order();

-- Backfill konkrete færdige ordrer uden faktura, så de bliver behandlet med det samme.
INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation)
SELECT o.business_id, 'invoice', o.id, 'create'
FROM public.orders o
JOIN public.accounting_integrations ai ON ai.business_id = o.business_id AND ai.is_active = true
WHERE o.status = 'completed'
  AND o.invoice_external_id IS NULL
  AND o.total_amount > 0
  AND o.customer_email <> ''
  AND COALESCE(o.notes, '') NOT ILIKE 'Auto-importeret fra %'
ON CONFLICT DO NOTHING;

-- Start sync for de berørte virksomheder.
SELECT public.kick_accounting_sync(ai.business_id)
FROM public.accounting_integrations ai
WHERE ai.provider = 'economic' AND ai.is_active = true;
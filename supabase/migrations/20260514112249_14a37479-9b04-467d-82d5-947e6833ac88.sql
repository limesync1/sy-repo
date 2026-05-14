-- Tillad aftaleforekomster og fakturering i regnskabskøen
ALTER TABLE public.accounting_sync_queue
  DROP CONSTRAINT IF EXISTS accounting_sync_queue_entity_type_chk;
ALTER TABLE public.accounting_sync_queue
  ADD CONSTRAINT accounting_sync_queue_entity_type_chk
  CHECK (entity_type IN ('customer','product','order','invoice','agreement_occurrence'));

ALTER TABLE public.accounting_sync_queue
  DROP CONSTRAINT IF EXISTS accounting_sync_queue_operation_check;
ALTER TABLE public.accounting_sync_queue
  ADD CONSTRAINT accounting_sync_queue_operation_check
  CHECK (operation IN ('create','update','delete','book','upsert','create_order','invoice'));

-- Skip auto-importerede/regnskabsbogførte orders, så de ikke pushes tilbage som nye ordrekladder
CREATE OR REPLACE FUNCTION public.enqueue_accounting_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_entity_type text;
  v_entity_id uuid;
  v_op text;
  v_has_integration boolean;
BEGIN
  IF TG_TABLE_NAME = 'orders' THEN
    -- Orders der allerede repræsenterer en ekstern faktura må ikke oprettes som nye ordrekladder igen.
    IF TG_OP <> 'DELETE' AND NEW.invoice_external_id IS NOT NULL THEN
      RETURN NEW;
    END IF;
    IF TG_OP <> 'DELETE' AND COALESCE(NEW.notes, '') ILIKE 'Auto-importeret fra %' THEN
      RETURN NEW;
    END IF;
    v_entity_type := 'order';
    v_business_id := COALESCE(NEW.business_id, OLD.business_id);
    v_entity_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'services' THEN
    v_entity_type := 'product';
    v_business_id := COALESCE(NEW.business_id, OLD.business_id);
    v_entity_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'business_customers' OR TG_TABLE_NAME = 'private_customers' THEN
    v_entity_type := 'customer';
    v_business_id := COALESCE(NEW.business_id, OLD.business_id);
    v_entity_id := COALESCE(NEW.id, OLD.id);
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_business_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.accounting_integrations
    WHERE business_id = v_business_id AND is_active = true
  ) INTO v_has_integration;

  IF NOT v_has_integration THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_op := CASE TG_OP
            WHEN 'INSERT' THEN 'create'
            WHEN 'UPDATE' THEN 'update'
            WHEN 'DELETE' THEN 'delete'
          END;

  INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation)
  VALUES (v_business_id, v_entity_type, v_entity_id, v_op)
  ON CONFLICT DO NOTHING;

  PERFORM public.kick_accounting_sync(v_business_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Når en aftaleforekomst markeres udført, skal ordrekladden bogføres/sendes som faktura
CREATE OR REPLACE FUNCTION public.enqueue_invoice_for_completed_occurrence()
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
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN RETURN NEW; END IF;
  IF NEW.invoice_external_id IS NOT NULL THEN RETURN NEW; END IF;

  SELECT billing_model INTO v_model FROM public.agreements WHERE id = NEW.agreement_id;
  IF v_model = 'monthly_consolidated' THEN RETURN NEW; END IF;

  SELECT is_active, paused_until INTO v_active, v_paused
  FROM public.accounting_integrations
  WHERE business_id = NEW.business_id LIMIT 1;
  IF NOT COALESCE(v_active, false) THEN RETURN NEW; END IF;
  IF v_paused IS NOT NULL AND v_paused > now() THEN RETURN NEW; END IF;

  INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation)
  VALUES (NEW.business_id, 'agreement_occurrence', NEW.id, 'invoice')
  ON CONFLICT DO NOTHING;

  PERFORM public.kick_accounting_sync(NEW.business_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_invoice_for_completed_occurrence ON public.agreement_occurrences;
CREATE TRIGGER trg_enqueue_invoice_for_completed_occurrence
AFTER UPDATE OF status ON public.agreement_occurrences
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_invoice_for_completed_occurrence();
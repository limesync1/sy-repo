
-- Phase 7: Make accounting_order_links able to point at agreement_occurrence_id (samme tabel, ny kolonne)
-- så hver materialiseret aftale-forekomst kan bogføres som sin egen faktura.

ALTER TABLE public.accounting_order_links
  ALTER COLUMN order_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS agreement_occurrence_id uuid;

-- Præcis ét af felterne skal være sat
ALTER TABLE public.accounting_order_links
  DROP CONSTRAINT IF EXISTS accounting_order_links_target_check;
ALTER TABLE public.accounting_order_links
  ADD CONSTRAINT accounting_order_links_target_check
  CHECK ((order_id IS NOT NULL)::int + (agreement_occurrence_id IS NOT NULL)::int = 1);

-- Unikt link pr. (business, provider, occurrence)
CREATE UNIQUE INDEX IF NOT EXISTS accounting_order_links_business_provider_occurrence_uniq
  ON public.accounting_order_links (business_id, provider, agreement_occurrence_id)
  WHERE agreement_occurrence_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS accounting_order_links_occurrence_idx
  ON public.accounting_order_links (agreement_occurrence_id)
  WHERE agreement_occurrence_id IS NOT NULL;

-- Trigger: når en aftale-forekomst markeres completed → enqueue invoice-job
CREATE OR REPLACE FUNCTION public.enqueue_invoice_for_completed_occurrence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active boolean;
  v_paused timestamptz;
BEGIN
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN RETURN NEW; END IF;

  SELECT is_active, paused_until INTO v_active, v_paused
  FROM public.accounting_integrations
  WHERE business_id = NEW.business_id
  LIMIT 1;
  IF NOT COALESCE(v_active, false) THEN RETURN NEW; END IF;
  IF v_paused IS NOT NULL AND v_paused > now() THEN RETURN NEW; END IF;

  BEGIN
    INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation)
    VALUES (NEW.business_id, 'agreement_occurrence', NEW.id, 'invoice');
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  PERFORM public.kick_accounting_sync(NEW.business_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_invoice_for_completed_occurrence ON public.agreement_occurrences;
CREATE TRIGGER trg_enqueue_invoice_for_completed_occurrence
AFTER INSERT OR UPDATE OF status ON public.agreement_occurrences
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_invoice_for_completed_occurrence();

-- Når en aftale-forekomst slettes/aflyses, ryd dens evt. ikke-bogførte link
-- (bogførte fakturaer beholder vi som historik).
CREATE OR REPLACE FUNCTION public.cleanup_link_on_occurrence_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    DELETE FROM public.accounting_order_links
     WHERE agreement_occurrence_id = NEW.id
       AND external_type IN ('order','invoice_draft','quote');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_link_on_occurrence_cancel ON public.agreement_occurrences;
CREATE TRIGGER trg_cleanup_link_on_occurrence_cancel
AFTER UPDATE OF status ON public.agreement_occurrences
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_link_on_occurrence_cancel();

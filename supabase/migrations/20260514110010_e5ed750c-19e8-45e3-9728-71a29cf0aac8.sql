-- Trigger: når en agreement_occurrence oprettes, kø en "create_order"-job
-- til regnskabssynkronisering, så ordren oprettes som kladde i virksomhedens
-- regnskabsprogram med det samme.

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
  -- Spring annullerede over
  IF NEW.status = 'cancelled' THEN RETURN NEW; END IF;

  -- Spring månedlig samlefakturering over (håndteres separat)
  SELECT billing_model INTO v_model FROM public.agreements WHERE id = NEW.agreement_id;
  IF v_model = 'monthly_consolidated' THEN RETURN NEW; END IF;

  -- Skal kun køre hvis der er en aktiv integration på virksomheden
  SELECT is_active, paused_until INTO v_active, v_paused
  FROM public.accounting_integrations
  WHERE business_id = NEW.business_id LIMIT 1;
  IF NOT COALESCE(v_active, false) THEN RETURN NEW; END IF;
  IF v_paused IS NOT NULL AND v_paused > now() THEN RETURN NEW; END IF;

  BEGIN
    INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation)
    VALUES (NEW.business_id, 'agreement_occurrence', NEW.id, 'create_order');
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  PERFORM public.kick_accounting_sync(NEW.business_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_order_for_new_occurrence ON public.agreement_occurrences;
CREATE TRIGGER trg_enqueue_order_for_new_occurrence
AFTER INSERT ON public.agreement_occurrences
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_order_for_new_occurrence();
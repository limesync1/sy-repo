-- Trigger: når et route_stop bliver completed, lægges et "invoice" job i køen
-- så accounting-sync drainQueue bogfører fakturaen i regnskabsprogrammet.
CREATE OR REPLACE FUNCTION public.enqueue_invoice_on_stop_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_has_integration boolean;
  v_paused timestamptz;
BEGIN
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN RETURN NEW; END IF;
  IF NEW.order_id IS NULL THEN RETURN NEW; END IF;

  SELECT id, business_id, invoice_external_id, total_amount, customer_email
    INTO v_order FROM public.orders WHERE id = NEW.order_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Skip hvis der allerede er en bogført faktura for ordren
  IF v_order.invoice_external_id IS NOT NULL THEN RETURN NEW; END IF;

  -- Skip hvis ordren ikke kan faktureres
  IF v_order.total_amount IS NULL OR v_order.total_amount <= 0 THEN RETURN NEW; END IF;
  IF v_order.customer_email IS NULL OR v_order.customer_email = '' THEN RETURN NEW; END IF;

  -- Kun hvis der er en aktiv, ikke-pauset regnskabsintegration
  SELECT is_active, paused_until INTO v_has_integration, v_paused
    FROM public.accounting_integrations
   WHERE business_id = v_order.business_id LIMIT 1;
  IF NOT COALESCE(v_has_integration, false) THEN RETURN NEW; END IF;
  IF v_paused IS NOT NULL AND v_paused > now() THEN RETURN NEW; END IF;

  BEGIN
    INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation)
    VALUES (v_order.business_id, 'invoice', v_order.id, 'create');
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  PERFORM public.kick_accounting_sync(v_order.business_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_invoice_on_stop_completion ON public.route_stops;
CREATE TRIGGER trg_enqueue_invoice_on_stop_completion
AFTER UPDATE ON public.route_stops
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_invoice_on_stop_completion();
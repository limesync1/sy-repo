CREATE OR REPLACE FUNCTION public.enqueue_invoice_when_route_stop_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_business_id uuid;
  v_has_integration boolean := false;
  v_occ_invoiced boolean := false;
  v_order_invoiced boolean := false;
BEGIN
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  SELECT r.business_id
    INTO v_business_id
  FROM public.routes r
  WHERE r.id = NEW.route_id;

  IF v_business_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.accounting_integrations ai
    WHERE ai.business_id = v_business_id
      AND ai.is_active = true
  ) INTO v_has_integration;

  IF NOT v_has_integration THEN
    RETURN NEW;
  END IF;

  IF NEW.agreement_occurrence_id IS NOT NULL THEN
    SELECT ao.invoice_external_id IS NOT NULL
      INTO v_occ_invoiced
    FROM public.agreement_occurrences ao
    WHERE ao.id = NEW.agreement_occurrence_id;

    IF COALESCE(v_occ_invoiced, false) = false THEN
      INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation, status, scheduled_for)
      SELECT v_business_id, 'agreement_occurrence', NEW.agreement_occurrence_id, 'invoice', 'pending', now()
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.accounting_sync_queue q
        WHERE q.business_id = v_business_id
          AND q.entity_type = 'agreement_occurrence'
          AND q.entity_id = NEW.agreement_occurrence_id
          AND q.status IN ('pending', 'processing')
      );
    END IF;
  END IF;

  IF NEW.order_id IS NOT NULL THEN
    SELECT o.invoice_external_id IS NOT NULL
      INTO v_order_invoiced
    FROM public.orders o
    WHERE o.id = NEW.order_id;

    IF COALESCE(v_order_invoiced, false) = false THEN
      INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation, status, scheduled_for)
      SELECT v_business_id, 'invoice', NEW.order_id, 'book', 'pending', now()
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.accounting_sync_queue q
        WHERE q.business_id = v_business_id
          AND q.entity_type = 'invoice'
          AND q.entity_id = NEW.order_id
          AND q.status IN ('pending', 'processing')
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_invoice_when_route_stop_completed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enqueue_invoice_when_route_stop_completed() TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_enqueue_invoice_when_route_stop_completed ON public.route_stops;
CREATE TRIGGER trg_enqueue_invoice_when_route_stop_completed
AFTER UPDATE OF status ON public.route_stops
FOR EACH ROW
WHEN (NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed'))
EXECUTE FUNCTION public.enqueue_invoice_when_route_stop_completed();

INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation, status, scheduled_for)
SELECT DISTINCT r.business_id, 'agreement_occurrence', rs.agreement_occurrence_id, 'invoice', 'pending', now()
FROM public.route_stops rs
JOIN public.routes r ON r.id = rs.route_id
JOIN public.agreement_occurrences ao ON ao.id = rs.agreement_occurrence_id
WHERE rs.status = 'completed'
  AND rs.agreement_occurrence_id IS NOT NULL
  AND ao.invoice_external_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.accounting_integrations ai
    WHERE ai.business_id = r.business_id AND ai.is_active = true
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.accounting_sync_queue q
    WHERE q.business_id = r.business_id
      AND q.entity_type = 'agreement_occurrence'
      AND q.entity_id = rs.agreement_occurrence_id
      AND q.status IN ('pending', 'processing')
  );

INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation, status, scheduled_for)
SELECT DISTINCT r.business_id, 'invoice', rs.order_id, 'book', 'pending', now()
FROM public.route_stops rs
JOIN public.routes r ON r.id = rs.route_id
JOIN public.orders o ON o.id = rs.order_id
WHERE rs.status = 'completed'
  AND rs.order_id IS NOT NULL
  AND o.invoice_external_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.accounting_integrations ai
    WHERE ai.business_id = r.business_id AND ai.is_active = true
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.accounting_sync_queue q
    WHERE q.business_id = r.business_id
      AND q.entity_type = 'invoice'
      AND q.entity_id = rs.order_id
      AND q.status IN ('pending', 'processing')
  );
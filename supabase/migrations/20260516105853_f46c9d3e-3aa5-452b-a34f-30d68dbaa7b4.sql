
CREATE OR REPLACE FUNCTION public.delete_cancelled_order(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_owner uuid;
BEGIN
  SELECT business_id INTO v_business_id
  FROM public.orders WHERE id = _order_id;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Aftalen blev ikke fundet. Prøv at genindlæse siden.';
  END IF;

  SELECT owner_id INTO v_owner FROM public.businesses WHERE id = v_business_id;

  IF NOT (v_owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Du har ikke rettigheder til at slette denne aftale.';
  END IF;

  -- Slet alle relaterede rækker — uanset aftalens status.
  DELETE FROM public.route_stops WHERE order_id = _order_id;
  DELETE FROM public.agreement_occurrences WHERE legacy_order_id = _order_id;
  DELETE FROM public.subscriptions WHERE order_id = _order_id;
  DELETE FROM public.accounting_order_links WHERE order_id = _order_id;
  DELETE FROM public.customer_notification_queue WHERE order_id = _order_id;
  DELETE FROM public.order_proposal_history WHERE order_id = _order_id;
  DELETE FROM public.employee_completed_stops WHERE order_id = _order_id;
  DELETE FROM public.order_items WHERE order_id = _order_id;
  DELETE FROM public.orders WHERE id = _order_id;
END;
$$;

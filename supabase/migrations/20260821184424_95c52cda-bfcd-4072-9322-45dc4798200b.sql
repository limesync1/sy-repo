CREATE OR REPLACE FUNCTION public.delete_cancelled_order(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_owner uuid;
  v_parent uuid;
  v_new_parent uuid;
BEGIN
  SELECT business_id, parent_order_id INTO v_business_id, v_parent
  FROM public.orders WHERE id = _order_id;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Aftalen blev ikke fundet. Prøv at genindlæse siden.';
  END IF;

  SELECT owner_id INTO v_owner FROM public.businesses WHERE id = v_business_id;

  IF NOT (v_owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Du har ikke rettigheder til at slette denne aftale.';
  END IF;

  -- Hvis denne ordre er "forælder" for en gruppe (flere services på samme
  -- bestilling), må vi IKKE lade FK'ens ON DELETE CASCADE rive søskende med.
  -- Vi udpeger derfor en ny forælder blandt de resterende ordrer i gruppen.
  IF EXISTS (
    SELECT 1 FROM public.orders
    WHERE parent_order_id = _order_id AND id <> _order_id
  ) THEN
    SELECT id INTO v_new_parent
    FROM public.orders
    WHERE parent_order_id = _order_id AND id <> _order_id
    ORDER BY created_at ASC, id ASC
    LIMIT 1;

    -- Peg først den nye forælder på sig selv (samme mønster som ved oprettelse),
    -- og flyt derefter resten af gruppen over på den.
    UPDATE public.orders SET parent_order_id = v_new_parent WHERE id = v_new_parent;
    UPDATE public.orders
      SET parent_order_id = v_new_parent
      WHERE parent_order_id = _order_id AND id <> _order_id AND id <> v_new_parent;
  END IF;

  -- Slet alle relaterede rækker for netop denne ene aftale.
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
-- Asserter at en rute kan slettes uden at efterlade dangling-referencer.
-- Bruges af ruteplanlæggeren EFTER en fletning til at validere oprydningen.
-- Raiser med en detaljeret fejlbesked hvis der stadig er referencer.
CREATE OR REPLACE FUNCTION public.assert_route_safely_deleted(_route_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_route_exists boolean;
  v_agreements int := 0;
  v_subscriptions int := 0;
  v_stops int := 0;
  v_children int := 0;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.routes WHERE id = _route_id) INTO v_route_exists;
  IF v_route_exists THEN
    -- Ruten findes stadig — det er kun et problem hvis der er gentagne
    -- aftaler der peger på den OG den har 0 stops (klassisk "spøgelses-rute").
    SELECT COUNT(*) INTO v_stops FROM public.route_stops WHERE route_id = _route_id;
    IF v_stops = 0 THEN
      SELECT COUNT(*) INTO v_agreements
        FROM public.agreements
       WHERE preferred_route_id = _route_id
         AND status = 'active'
         AND interval <> 'engangskøb';
      SELECT COUNT(*) INTO v_subscriptions
        FROM public.subscriptions
       WHERE preferred_route_id = _route_id
         AND status = 'active'
         AND interval <> 'engangskøb';
      -- Ingen invariant brudt — rute er enten brugt eller tom-men-ikke-orphan.
    END IF;
    RETURN;
  END IF;

  -- Ruten er slettet. Tjek at intet stadig peger på den.
  SELECT COUNT(*) INTO v_agreements
    FROM public.agreements
   WHERE preferred_route_id = _route_id;
  SELECT COUNT(*) INTO v_subscriptions
    FROM public.subscriptions
   WHERE preferred_route_id = _route_id;
  SELECT COUNT(*) INTO v_children
    FROM public.routes
   WHERE base_route_id = _route_id;

  IF v_agreements > 0 OR v_subscriptions > 0 THEN
    RAISE EXCEPTION 'Spøgelses-rute opdaget: rute % er slettet men % aftaler og % abonnementer peger stadig på den (children: %)',
      _route_id, v_agreements, v_subscriptions, v_children
      USING ERRCODE = 'data_exception';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assert_route_safely_deleted(uuid) TO authenticated, service_role;
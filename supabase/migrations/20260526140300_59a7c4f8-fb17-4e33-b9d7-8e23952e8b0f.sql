CREATE OR REPLACE FUNCTION public.remove_route_stop_safely(_stop_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stop record;
  v_route record;
  v_remaining int := 0;
  v_agreement_ids uuid[] := ARRAY[]::uuid[];
  v_subscription_ids uuid[] := ARRAY[]::uuid[];
  v_order_ids uuid[] := ARRAY[]::uuid[];
  v_route_deleted boolean := false;
BEGIN
  SELECT rs.*
    INTO v_stop
  FROM public.route_stops rs
  WHERE rs.id = _stop_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'stop_removed', false,
      'route_deleted', false,
      'remaining_stops', 0,
      'recurring_unlinked', false
    );
  END IF;

  SELECT id, business_id, route_date, name, archived_at, deleted_at
    INTO v_route
  FROM public.routes
  WHERE id = v_stop.route_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ruten findes ikke længere';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = v_route.business_id AND b.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Du har ikke adgang til at ændre denne rute';
  END IF;

  IF v_stop.subscription_id IS NOT NULL THEN
    v_subscription_ids := array_append(v_subscription_ids, v_stop.subscription_id);
  END IF;

  IF v_stop.order_id IS NOT NULL THEN
    v_order_ids := array_append(v_order_ids, v_stop.order_id);

    SELECT COALESCE(array_agg(DISTINCT x.id), ARRAY[]::uuid[])
      INTO v_subscription_ids
    FROM (
      SELECT unnest(v_subscription_ids) AS id
      UNION
      SELECT s.id
      FROM public.subscriptions s
      WHERE s.order_id = v_stop.order_id
        AND s.business_id = v_route.business_id
    ) x
    WHERE x.id IS NOT NULL;

    SELECT COALESCE(array_agg(DISTINCT x.id), ARRAY[]::uuid[])
      INTO v_agreement_ids
    FROM (
      SELECT unnest(v_agreement_ids) AS id
      UNION
      SELECT ao.agreement_id AS id
      FROM public.agreement_occurrences ao
      JOIN public.agreements a ON a.id = ao.agreement_id
      WHERE ao.legacy_order_id = v_stop.order_id
        AND a.business_id = v_route.business_id
    ) x
    WHERE x.id IS NOT NULL;
  END IF;

  IF v_stop.agreement_occurrence_id IS NOT NULL THEN
    SELECT COALESCE(array_agg(DISTINCT x.id), ARRAY[]::uuid[])
      INTO v_agreement_ids
    FROM (
      SELECT unnest(v_agreement_ids) AS id
      UNION
      SELECT ao.agreement_id AS id
      FROM public.agreement_occurrences ao
      WHERE ao.id = v_stop.agreement_occurrence_id
    ) x
    WHERE x.id IS NOT NULL;
  END IF;

  IF array_length(v_subscription_ids, 1) IS NOT NULL THEN
    UPDATE public.subscriptions
    SET preferred_route_id = NULL
    WHERE id = ANY(v_subscription_ids)
      AND business_id = v_route.business_id
      AND preferred_route_id = v_stop.route_id;
  END IF;

  IF array_length(v_agreement_ids, 1) IS NOT NULL THEN
    UPDATE public.agreements
    SET preferred_route_id = NULL
    WHERE id = ANY(v_agreement_ids)
      AND business_id = v_route.business_id
      AND preferred_route_id = v_stop.route_id;
  END IF;

  DELETE FROM public.route_stop_assignees WHERE stop_id = _stop_id;
  DELETE FROM public.route_stops WHERE id = _stop_id;

  SELECT COUNT(*) INTO v_remaining
  FROM public.route_stops rs
  WHERE rs.route_id = v_stop.route_id
    AND COALESCE(rs.status, 'planned') NOT IN ('completed', 'cancelled');

  IF v_remaining = 0 THEN
    DELETE FROM public.route_employees WHERE route_id = v_stop.route_id;
    DELETE FROM public.route_occurrence_exceptions
    WHERE replacement_route_id = v_stop.route_id
       OR base_route_id = v_stop.route_id;
    DELETE FROM public.routes WHERE id = v_stop.route_id;
    v_route_deleted := true;
  END IF;

  RETURN jsonb_build_object(
    'stop_removed', true,
    'route_deleted', v_route_deleted,
    'remaining_stops', v_remaining,
    'recurring_unlinked', (array_length(v_subscription_ids, 1) IS NOT NULL OR array_length(v_agreement_ids, 1) IS NOT NULL),
    'subscription_ids', COALESCE(to_jsonb(v_subscription_ids), '[]'::jsonb),
    'agreement_ids', COALESCE(to_jsonb(v_agreement_ids), '[]'::jsonb),
    'order_ids', COALESCE(to_jsonb(v_order_ids), '[]'::jsonb)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.remove_route_stop_safely(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_route_stop_safely(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.cleanup_route_after_stop_delete(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_route_after_stop_delete(uuid) TO authenticated, service_role;
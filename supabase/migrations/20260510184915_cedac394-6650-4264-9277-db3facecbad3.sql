CREATE OR REPLACE FUNCTION public.sync_preferred_route_from_stop()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_agreement_id uuid;
  v_subscription_ids uuid[] := '{}'::uuid[];
BEGIN
  IF NEW.route_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.subscription_id IS NOT NULL THEN
    v_subscription_ids := array_append(v_subscription_ids, NEW.subscription_id);
  END IF;

  IF NEW.order_id IS NOT NULL THEN
    SELECT COALESCE(array_agg(s.id), '{}'::uuid[])
      INTO v_subscription_ids
      FROM public.subscriptions s
     WHERE s.order_id = NEW.order_id
        OR s.id = ANY(v_subscription_ids);
  END IF;

  v_subscription_ids := ARRAY(
    SELECT DISTINCT x
      FROM unnest(COALESCE(v_subscription_ids, '{}'::uuid[])) AS x
     WHERE x IS NOT NULL
  );

  -- 1) Direct link via agreement_occurrence_id (new model).
  IF NEW.agreement_occurrence_id IS NOT NULL THEN
    SELECT agreement_id INTO v_agreement_id
      FROM public.agreement_occurrences
     WHERE id = NEW.agreement_occurrence_id;
  END IF;

  -- 2) Fallback: order_id chain via occurrences.
  IF v_agreement_id IS NULL AND NEW.order_id IS NOT NULL THEN
    SELECT agreement_id INTO v_agreement_id
      FROM public.agreement_occurrences
     WHERE legacy_order_id = NEW.order_id
     ORDER BY occurrence_date DESC, created_at DESC
     LIMIT 1;
  END IF;

  -- 3) Fallback: agreements migrated from subscriptions.
  IF v_agreement_id IS NULL AND array_length(v_subscription_ids, 1) IS NOT NULL THEN
    SELECT id INTO v_agreement_id
      FROM public.agreements
     WHERE legacy_subscription_id = ANY(v_subscription_ids)
     ORDER BY created_at DESC
     LIMIT 1;
  END IF;

  IF v_agreement_id IS NOT NULL THEN
    UPDATE public.agreements
       SET preferred_route_id = NEW.route_id,
           updated_at = now()
     WHERE id = v_agreement_id
       AND preferred_route_id IS NULL
       AND status = 'active'
       AND interval <> 'engangskøb';
  END IF;

  IF array_length(v_subscription_ids, 1) IS NOT NULL THEN
    UPDATE public.subscriptions
       SET preferred_route_id = NEW.route_id,
           updated_at = now()
     WHERE id = ANY(v_subscription_ids)
       AND preferred_route_id IS NULL
       AND status = 'active'
       AND interval <> 'engangskøb';
  END IF;

  IF NEW.order_id IS NOT NULL THEN
    UPDATE public.subscriptions
       SET preferred_route_id = NEW.route_id,
           updated_at = now()
     WHERE order_id = NEW.order_id
       AND preferred_route_id IS NULL
       AND status = 'active'
       AND interval <> 'engangskøb';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_preferred_route_from_stop ON public.route_stops;
CREATE TRIGGER trg_sync_preferred_route_from_stop
AFTER INSERT OR UPDATE OF route_id, order_id, subscription_id, agreement_occurrence_id
ON public.route_stops
FOR EACH ROW
EXECUTE FUNCTION public.sync_preferred_route_from_stop();
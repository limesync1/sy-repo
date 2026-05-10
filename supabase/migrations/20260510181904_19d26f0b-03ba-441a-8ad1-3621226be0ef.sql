-- Auto-set agreements.preferred_route_id (and subscriptions.preferred_route_id)
-- when a route_stop is created/updated that links to a recurring agreement,
-- so the calendar can project future occurrences on the same route.
--
-- Without this, agreements end up with preferred_route_id = NULL forever and
-- the recurring projection layer in the route planner shows nothing.

CREATE OR REPLACE FUNCTION public.sync_preferred_route_from_stop()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agreement_id uuid;
BEGIN
  IF NEW.route_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 1) Direct link via agreement_occurrence_id (new model).
  IF NEW.agreement_occurrence_id IS NOT NULL THEN
    SELECT agreement_id INTO v_agreement_id
    FROM public.agreement_occurrences
    WHERE id = NEW.agreement_occurrence_id;
  END IF;

  -- 2) Fallback: order_id chain (old model). Look up via legacy_order_id on
  --    occurrences, then via subscriptions.order_id.
  IF v_agreement_id IS NULL AND NEW.order_id IS NOT NULL THEN
    SELECT agreement_id INTO v_agreement_id
    FROM public.agreement_occurrences
    WHERE legacy_order_id = NEW.order_id
    LIMIT 1;
  END IF;

  -- Set preferred_route_id on agreement (only when null, only recurring/active)
  IF v_agreement_id IS NOT NULL THEN
    UPDATE public.agreements
       SET preferred_route_id = NEW.route_id
     WHERE id = v_agreement_id
       AND preferred_route_id IS NULL
       AND status = 'active'
       AND interval <> 'engangskøb';
  END IF;

  -- Also set on linked subscriptions (legacy model) when present.
  IF NEW.subscription_id IS NOT NULL THEN
    UPDATE public.subscriptions
       SET preferred_route_id = NEW.route_id
     WHERE id = NEW.subscription_id
       AND preferred_route_id IS NULL
       AND status = 'active'
       AND interval <> 'engangskøb';
  ELSIF NEW.order_id IS NOT NULL THEN
    UPDATE public.subscriptions
       SET preferred_route_id = NEW.route_id
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

-- One-off backfill for all existing route_stops so projections appear immediately.
WITH stop_to_agreement AS (
  SELECT
    rs.route_id,
    COALESCE(
      ao_direct.agreement_id,
      ao_legacy.agreement_id
    ) AS agreement_id
  FROM public.route_stops rs
  LEFT JOIN public.agreement_occurrences ao_direct
    ON ao_direct.id = rs.agreement_occurrence_id
  LEFT JOIN public.agreement_occurrences ao_legacy
    ON ao_legacy.legacy_order_id = rs.order_id
   AND ao_direct.id IS NULL
  WHERE rs.route_id IS NOT NULL
),
ranked AS (
  SELECT DISTINCT ON (s.agreement_id)
    s.agreement_id,
    s.route_id
  FROM stop_to_agreement s
  WHERE s.agreement_id IS NOT NULL
)
UPDATE public.agreements a
   SET preferred_route_id = r.route_id
  FROM ranked r
 WHERE a.id = r.agreement_id
   AND a.preferred_route_id IS NULL
   AND a.status = 'active'
   AND a.interval <> 'engangskøb';

-- Backfill subscriptions too via order_id mapping.
UPDATE public.subscriptions s
   SET preferred_route_id = rs.route_id
  FROM public.route_stops rs
 WHERE s.order_id = rs.order_id
   AND s.preferred_route_id IS NULL
   AND s.status = 'active'
   AND s.interval <> 'engangskøb'
   AND rs.route_id IS NOT NULL;
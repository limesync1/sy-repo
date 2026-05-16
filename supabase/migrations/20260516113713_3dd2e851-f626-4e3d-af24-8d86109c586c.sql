
-- Backfill preferred_route_id på subscriptions ud fra eksisterende route_stops (via order_id).
UPDATE public.subscriptions s
   SET preferred_route_id = rs.route_id
  FROM public.route_stops rs
 WHERE s.order_id = rs.order_id
   AND s.preferred_route_id IS NULL
   AND s.status = 'active'
   AND s.interval <> 'engangskøb'
   AND rs.route_id IS NOT NULL;

-- Backfill preferred_route_id på agreements ud fra route_stops via legacy_subscription_id (subscription.order_id → route_stops.order_id).
UPDATE public.agreements a
   SET preferred_route_id = s.preferred_route_id
  FROM public.subscriptions s
 WHERE a.legacy_subscription_id = s.id
   AND a.preferred_route_id IS NULL
   AND s.preferred_route_id IS NOT NULL
   AND a.status = 'active'
   AND a.interval <> 'engangskøb';

-- Backfill preferred_route_id på agreements via direkte agreement_occurrence-link.
WITH stop_to_agreement AS (
  SELECT DISTINCT ON (ao.agreement_id)
    ao.agreement_id,
    rs.route_id
  FROM public.route_stops rs
  JOIN public.agreement_occurrences ao
    ON ao.id = rs.agreement_occurrence_id
   OR ao.legacy_order_id = rs.order_id
  WHERE rs.route_id IS NOT NULL
)
UPDATE public.agreements a
   SET preferred_route_id = s.route_id
  FROM stop_to_agreement s
 WHERE a.id = s.agreement_id
   AND a.preferred_route_id IS NULL
   AND a.status = 'active'
   AND a.interval <> 'engangskøb';

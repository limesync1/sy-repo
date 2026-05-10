-- 1) Switch route_stops.order_id and route_stops.subscription_id from
--    ON DELETE SET NULL to ON DELETE CASCADE so deleting an order
--    or subscription also removes its planned route stops.
ALTER TABLE public.route_stops
  DROP CONSTRAINT IF EXISTS route_stops_order_id_fkey;
ALTER TABLE public.route_stops
  ADD CONSTRAINT route_stops_order_id_fkey
  FOREIGN KEY (order_id)
  REFERENCES public.orders(id)
  ON DELETE CASCADE;

ALTER TABLE public.route_stops
  DROP CONSTRAINT IF EXISTS route_stops_subscription_id_fkey;
ALTER TABLE public.route_stops
  ADD CONSTRAINT route_stops_subscription_id_fkey
  FOREIGN KEY (subscription_id)
  REFERENCES public.subscriptions(id)
  ON DELETE CASCADE;

-- 2) Remove existing ghost stops left behind by previous deletions.
--    Only target stops on "real" (non-materialised) routes — materialised
--    routes intentionally clone stops without FK links and must be kept.
DELETE FROM public.route_stops rs
USING public.routes r
WHERE rs.route_id = r.id
  AND r.base_route_id IS NULL
  AND rs.order_id IS NULL
  AND rs.subscription_id IS NULL
  AND rs.agreement_occurrence_id IS NULL;
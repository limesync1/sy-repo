ALTER TABLE public.customer_notification_queue
  DROP CONSTRAINT IF EXISTS customer_notification_queue_route_stop_id_fkey;

ALTER TABLE public.customer_notification_queue
  ADD CONSTRAINT customer_notification_queue_route_stop_id_fkey
  FOREIGN KEY (route_stop_id) REFERENCES public.route_stops(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
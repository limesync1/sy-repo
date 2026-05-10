-- Trigger queue_customer_notifications_for_stop bruger ON CONFLICT (order_id, event_type, channel)
-- men der eksisterede ingen unik constraint. Tilføj den nu.
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_notification_queue_order_event_channel
  ON public.customer_notification_queue (order_id, event_type, channel)
  WHERE order_id IS NOT NULL;

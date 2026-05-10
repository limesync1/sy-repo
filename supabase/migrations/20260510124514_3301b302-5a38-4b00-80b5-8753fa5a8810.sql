-- Drop partial unique indexes; ON CONFLICT without a predicate cannot match partial indexes.
DROP INDEX IF EXISTS public.customer_notif_queue_order_uniq;
DROP INDEX IF EXISTS public.uq_customer_notification_queue_order_event_channel;

-- Create a full unique index. NULL order_id values are treated as distinct, so
-- occurrence-only rows are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS customer_notification_queue_order_event_channel_key
  ON public.customer_notification_queue (order_id, event_type, channel);
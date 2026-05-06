
-- 1) Tilføj 'channel' til templates og queue så vi kan have både email og sms pr. event

-- Templates: bevar eksisterende rækker som 'email'
ALTER TABLE public.customer_notification_templates
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'email';

ALTER TABLE public.customer_notification_templates
  DROP CONSTRAINT IF EXISTS customer_notification_templates_business_id_event_type_key;

CREATE UNIQUE INDEX IF NOT EXISTS customer_notification_templates_unique
  ON public.customer_notification_templates (business_id, event_type, channel);

-- Tillad tom subject for SMS (subject bruges ikke til SMS)
ALTER TABLE public.customer_notification_templates
  ALTER COLUMN subject DROP NOT NULL;

-- Queue: tilføj kanal + telefon
ALTER TABLE public.customer_notification_queue
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS recipient_phone text;

ALTER TABLE public.customer_notification_queue
  ALTER COLUMN recipient_email DROP NOT NULL;

ALTER TABLE public.customer_notification_queue
  DROP CONSTRAINT IF EXISTS customer_notification_queue_order_id_event_type_key;

CREATE UNIQUE INDEX IF NOT EXISTS customer_notification_queue_unique
  ON public.customer_notification_queue (order_id, event_type, channel);

-- 2) Opdater queue-trigger funktion: kø også SMS hvis kunde har telefonnummer + virksomheden har afsender-id
CREATE OR REPLACE FUNCTION public.queue_customer_notifications_for_stop()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_order RECORD;
  v_business RECORD;
  v_hours_before integer;
  v_send_at timestamptz;
  v_sms_sender text;
  v_sms_enabled boolean;
BEGIN
  IF NEW.order_id IS NULL THEN RETURN NEW; END IF;
  SELECT id, business_id, customer_email, customer_phone INTO v_order FROM public.orders WHERE id = NEW.order_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT id, settings INTO v_business FROM public.businesses WHERE id = v_order.business_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  v_hours_before := COALESCE(((v_business.settings->>'customer_notif_upcoming_hours')::integer), 24);
  v_sms_sender   := NULLIF(v_business.settings->>'sms_sender_id', '');
  v_sms_enabled  := COALESCE((v_business.settings->>'sms_enabled')::boolean, false);

  -- 1) "service_upcoming"
  IF NEW.planned_arrival IS NOT NULL THEN
    v_send_at := NEW.planned_arrival - (v_hours_before || ' hours')::interval;
    IF v_send_at < now() THEN v_send_at := now(); END IF;

    IF v_order.customer_email IS NOT NULL THEN
      INSERT INTO public.customer_notification_queue
        (business_id, order_id, route_stop_id, event_type, channel, recipient_email, send_at)
      VALUES
        (v_order.business_id, v_order.id, NEW.id, 'service_upcoming', 'email', v_order.customer_email, v_send_at)
      ON CONFLICT (order_id, event_type, channel) DO UPDATE
        SET send_at = EXCLUDED.send_at, route_stop_id = EXCLUDED.route_stop_id, status = 'pending';
    END IF;

    IF v_sms_enabled AND v_sms_sender IS NOT NULL AND v_order.customer_phone IS NOT NULL THEN
      INSERT INTO public.customer_notification_queue
        (business_id, order_id, route_stop_id, event_type, channel, recipient_phone, send_at)
      VALUES
        (v_order.business_id, v_order.id, NEW.id, 'service_upcoming', 'sms', v_order.customer_phone, v_send_at)
      ON CONFLICT (order_id, event_type, channel) DO UPDATE
        SET send_at = EXCLUDED.send_at, route_stop_id = EXCLUDED.route_stop_id, status = 'pending';
    END IF;
  END IF;

  -- 2) "service_completed"
  IF (TG_OP = 'UPDATE') AND NEW.status = 'completed' AND COALESCE(OLD.status,'') <> 'completed' THEN
    IF v_order.customer_email IS NOT NULL THEN
      INSERT INTO public.customer_notification_queue
        (business_id, order_id, route_stop_id, event_type, channel, recipient_email, send_at)
      VALUES
        (v_order.business_id, v_order.id, NEW.id, 'service_completed', 'email', v_order.customer_email, now())
      ON CONFLICT (order_id, event_type, channel) DO UPDATE
        SET send_at = now(), route_stop_id = EXCLUDED.route_stop_id, status = 'pending';
    END IF;

    IF v_sms_enabled AND v_sms_sender IS NOT NULL AND v_order.customer_phone IS NOT NULL THEN
      INSERT INTO public.customer_notification_queue
        (business_id, order_id, route_stop_id, event_type, channel, recipient_phone, send_at)
      VALUES
        (v_order.business_id, v_order.id, NEW.id, 'service_completed', 'sms', v_order.customer_phone, now())
      ON CONFLICT (order_id, event_type, channel) DO UPDATE
        SET send_at = now(), route_stop_id = EXCLUDED.route_stop_id, status = 'pending';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

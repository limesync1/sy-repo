
ALTER TABLE public.customer_notification_templates
  ADD COLUMN IF NOT EXISTS days_before integer,
  ADD COLUMN IF NOT EXISTS send_at_time time without time zone;

CREATE OR REPLACE FUNCTION public.queue_customer_notifications_for_stop()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_order RECORD;
  v_business RECORD;
  v_default_minutes integer;
  v_email_minutes integer;
  v_sms_minutes integer;
  v_email_days integer;
  v_email_time time;
  v_sms_days integer;
  v_sms_time time;
  v_send_at timestamptz;
  v_local_date date;
  v_sms_enabled boolean;
BEGIN
  IF NEW.order_id IS NULL THEN RETURN NEW; END IF;
  SELECT id, business_id, customer_email, customer_phone INTO v_order FROM public.orders WHERE id = NEW.order_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT id, settings INTO v_business FROM public.businesses WHERE id = v_order.business_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  v_default_minutes := COALESCE(
    (v_business.settings->>'customer_notif_upcoming_minutes')::integer,
    ((v_business.settings->>'customer_notif_upcoming_hours')::integer) * 60,
    24 * 60
  );
  v_sms_enabled := COALESCE((v_business.settings->>'sms_enabled')::boolean, false);

  SELECT lead_time_minutes, days_before, send_at_time
    INTO v_email_minutes, v_email_days, v_email_time
    FROM public.customer_notification_templates
   WHERE business_id = v_order.business_id AND event_type = 'service_upcoming' AND channel = 'email'
   LIMIT 1;

  SELECT lead_time_minutes, days_before, send_at_time
    INTO v_sms_minutes, v_sms_days, v_sms_time
    FROM public.customer_notification_templates
   WHERE business_id = v_order.business_id AND event_type = 'service_upcoming' AND channel = 'sms'
   LIMIT 1;

  IF NEW.planned_arrival IS NOT NULL THEN
    v_local_date := (NEW.planned_arrival AT TIME ZONE 'Europe/Copenhagen')::date;

    IF v_order.customer_email IS NOT NULL THEN
      IF v_email_days IS NOT NULL AND v_email_time IS NOT NULL THEN
        v_send_at := ((v_local_date - v_email_days) + v_email_time) AT TIME ZONE 'Europe/Copenhagen';
      ELSE
        v_send_at := NEW.planned_arrival - (COALESCE(v_email_minutes, v_default_minutes) || ' minutes')::interval;
      END IF;
      IF v_send_at < now() THEN v_send_at := now(); END IF;
      INSERT INTO public.customer_notification_queue
        (business_id, order_id, route_stop_id, event_type, channel, recipient_email, send_at)
      VALUES
        (v_order.business_id, v_order.id, NEW.id, 'service_upcoming', 'email', v_order.customer_email, v_send_at)
      ON CONFLICT (order_id, event_type, channel) DO UPDATE
        SET send_at = EXCLUDED.send_at, route_stop_id = EXCLUDED.route_stop_id, status = 'pending';
    END IF;

    IF v_sms_enabled AND v_order.customer_phone IS NOT NULL THEN
      IF v_sms_days IS NOT NULL AND v_sms_time IS NOT NULL THEN
        v_send_at := ((v_local_date - v_sms_days) + v_sms_time) AT TIME ZONE 'Europe/Copenhagen';
      ELSE
        v_send_at := NEW.planned_arrival - (COALESCE(v_sms_minutes, v_default_minutes) || ' minutes')::interval;
      END IF;
      IF v_send_at < now() THEN v_send_at := now(); END IF;
      INSERT INTO public.customer_notification_queue
        (business_id, order_id, route_stop_id, event_type, channel, recipient_phone, send_at)
      VALUES
        (v_order.business_id, v_order.id, NEW.id, 'service_upcoming', 'sms', v_order.customer_phone, v_send_at)
      ON CONFLICT (order_id, event_type, channel) DO UPDATE
        SET send_at = EXCLUDED.send_at, route_stop_id = EXCLUDED.route_stop_id, status = 'pending';
    END IF;
  END IF;

  IF (TG_OP = 'UPDATE') AND NEW.status = 'completed' AND COALESCE(OLD.status,'') <> 'completed' THEN
    IF v_order.customer_email IS NOT NULL THEN
      INSERT INTO public.customer_notification_queue
        (business_id, order_id, route_stop_id, event_type, channel, recipient_email, send_at)
      VALUES
        (v_order.business_id, v_order.id, NEW.id, 'service_completed', 'email', v_order.customer_email, now())
      ON CONFLICT (order_id, event_type, channel) DO UPDATE
        SET send_at = now(), route_stop_id = EXCLUDED.route_stop_id, status = 'pending';
    END IF;

    IF v_sms_enabled AND v_order.customer_phone IS NOT NULL THEN
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

CREATE OR REPLACE FUNCTION public.queue_customer_notifications_for_stop()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_order RECORD;
  v_business RECORD;
  v_route RECORD;
  v_default_minutes integer;
  v_email_minutes integer;
  v_sms_minutes integer;
  v_email_days integer;
  v_email_time time;
  v_sms_days integer;
  v_sms_time time;
  v_send_at timestamptz;
  v_arrival timestamptz;
  v_local_date date;
  v_sms_enabled boolean;
  v_route_stop_id uuid;
BEGIN
  IF NEW.order_id IS NULL THEN RETURN NEW; END IF;

  SELECT id, business_id, customer_email, customer_phone
    INTO v_order
    FROM public.orders
   WHERE id = NEW.order_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT id, settings
    INTO v_business
    FROM public.businesses
   WHERE id = v_order.business_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- The completion trigger may delete the route stop before this trigger runs.
  -- Only keep route_stop_id while the row still exists; completed notifications
  -- can safely be tied to the order alone.
  IF EXISTS (SELECT 1 FROM public.route_stops rs WHERE rs.id = NEW.id) THEN
    v_route_stop_id := NEW.id;
  ELSE
    v_route_stop_id := NULL;
  END IF;

  v_default_minutes := COALESCE(
    (v_business.settings->>'customer_notif_upcoming_minutes')::integer,
    ((v_business.settings->>'customer_notif_upcoming_hours')::integer) * 60,
    24 * 60
  );
  v_sms_enabled := COALESCE((v_business.settings->>'sms_enabled')::boolean, false);

  -- Only queue upcoming notifications for stops that are not completed.
  -- Completion is handled separately below and the stop may be removed from route_stops.
  IF COALESCE(NEW.status, '') <> 'completed' THEN
    -- Beregn effektiv ankomst: brug planned_arrival hvis sat, ellers route_date + planned_start_time
    v_arrival := NEW.planned_arrival;
    IF v_arrival IS NULL AND NEW.route_id IS NOT NULL THEN
      SELECT route_date, planned_start_time INTO v_route FROM public.routes WHERE id = NEW.route_id;
      IF FOUND AND v_route.route_date IS NOT NULL THEN
        v_arrival := ((v_route.route_date::timestamp + COALESCE(v_route.planned_start_time, '08:00'::time))) AT TIME ZONE 'Europe/Copenhagen';
      END IF;
    END IF;

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

    IF v_arrival IS NOT NULL THEN
      v_local_date := (v_arrival AT TIME ZONE 'Europe/Copenhagen')::date;

      IF v_order.customer_email IS NOT NULL THEN
        IF v_email_days IS NOT NULL AND v_email_time IS NOT NULL THEN
          v_send_at := ((v_local_date - v_email_days) + v_email_time) AT TIME ZONE 'Europe/Copenhagen';
        ELSE
          v_send_at := v_arrival - (COALESCE(v_email_minutes, v_default_minutes) || ' minutes')::interval;
        END IF;
        IF v_send_at < now() THEN v_send_at := now(); END IF;
        INSERT INTO public.customer_notification_queue
          (business_id, order_id, route_stop_id, event_type, channel, recipient_email, send_at)
        VALUES
          (v_order.business_id, v_order.id, v_route_stop_id, 'service_upcoming', 'email', v_order.customer_email, v_send_at)
        ON CONFLICT (order_id, event_type, channel) DO UPDATE
          SET send_at = EXCLUDED.send_at, route_stop_id = EXCLUDED.route_stop_id,
              status = CASE WHEN public.customer_notification_queue.status = 'sent' THEN 'sent' ELSE 'pending' END;
      END IF;

      IF v_sms_enabled AND v_order.customer_phone IS NOT NULL THEN
        IF v_sms_days IS NOT NULL AND v_sms_time IS NOT NULL THEN
          v_send_at := ((v_local_date - v_sms_days) + v_sms_time) AT TIME ZONE 'Europe/Copenhagen';
        ELSE
          v_send_at := v_arrival - (COALESCE(v_sms_minutes, v_default_minutes) || ' minutes')::interval;
        END IF;
        IF v_send_at < now() THEN v_send_at := now(); END IF;
        INSERT INTO public.customer_notification_queue
          (business_id, order_id, route_stop_id, event_type, channel, recipient_phone, send_at)
        VALUES
          (v_order.business_id, v_order.id, v_route_stop_id, 'service_upcoming', 'sms', v_order.customer_phone, v_send_at)
        ON CONFLICT (order_id, event_type, channel) DO UPDATE
          SET send_at = EXCLUDED.send_at, route_stop_id = EXCLUDED.route_stop_id,
              status = CASE WHEN public.customer_notification_queue.status = 'sent' THEN 'sent' ELSE 'pending' END;
      END IF;
    END IF;
  END IF;

  IF (TG_OP = 'UPDATE') AND NEW.status = 'completed' AND COALESCE(OLD.status,'') <> 'completed' THEN
    IF v_order.customer_email IS NOT NULL THEN
      INSERT INTO public.customer_notification_queue
        (business_id, order_id, route_stop_id, event_type, channel, recipient_email, send_at)
      VALUES
        (v_order.business_id, v_order.id, NULL, 'service_completed', 'email', v_order.customer_email, now())
      ON CONFLICT (order_id, event_type, channel) DO UPDATE
        SET send_at = now(), route_stop_id = NULL, status = 'pending';
    END IF;

    IF v_sms_enabled AND v_order.customer_phone IS NOT NULL THEN
      INSERT INTO public.customer_notification_queue
        (business_id, order_id, route_stop_id, event_type, channel, recipient_phone, send_at)
      VALUES
        (v_order.business_id, v_order.id, NULL, 'service_completed', 'sms', v_order.customer_phone, now())
      ON CONFLICT (order_id, event_type, channel) DO UPDATE
        SET send_at = now(), route_stop_id = NULL, status = 'pending';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
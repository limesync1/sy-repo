-- Gruppe E – kunde-notifikationer pr. e-mail (skabeloner + kø)

CREATE TABLE IF NOT EXISTS public.customer_notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  subject text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, event_type)
);
ALTER TABLE public.customer_notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their notif templates"
  ON public.customer_notification_templates FOR ALL
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = customer_notification_templates.business_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = customer_notification_templates.business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Admins manage all notif templates"
  ON public.customer_notification_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_notif_templates_updated ON public.customer_notification_templates;
CREATE TRIGGER trg_notif_templates_updated BEFORE UPDATE ON public.customer_notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.customer_notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  route_stop_id uuid REFERENCES public.route_stops(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  recipient_email text NOT NULL,
  send_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending', -- pending|sent|failed|cancelled
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, event_type)
);
ALTER TABLE public.customer_notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view their notif queue"
  ON public.customer_notification_queue FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = customer_notification_queue.business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Admins manage all notif queue"
  ON public.customer_notification_queue FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_notif_queue_due
  ON public.customer_notification_queue(status, send_at)
  WHERE status = 'pending';

-- Hjælpefunktion: indsæt rækker i køen baseret på rute-stop
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
BEGIN
  IF NEW.order_id IS NULL THEN RETURN NEW; END IF;
  SELECT id, business_id, customer_email INTO v_order FROM public.orders WHERE id = NEW.order_id;
  IF NOT FOUND OR v_order.customer_email IS NULL THEN RETURN NEW; END IF;
  SELECT id, settings INTO v_business FROM public.businesses WHERE id = v_order.business_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  v_hours_before := COALESCE(((v_business.settings->>'customer_notif_upcoming_hours')::integer), 24);

  -- 1) "service_upcoming": planlagt N timer før planlagt ankomst
  IF NEW.planned_arrival IS NOT NULL THEN
    v_send_at := NEW.planned_arrival - (v_hours_before || ' hours')::interval;
    IF v_send_at < now() THEN v_send_at := now(); END IF;
    INSERT INTO public.customer_notification_queue
      (business_id, order_id, route_stop_id, event_type, recipient_email, send_at)
    VALUES
      (v_order.business_id, v_order.id, NEW.id, 'service_upcoming', v_order.customer_email, v_send_at)
    ON CONFLICT (order_id, event_type) DO UPDATE
      SET send_at = EXCLUDED.send_at,
          route_stop_id = EXCLUDED.route_stop_id,
          status = 'pending';
  END IF;

  -- 2) "service_completed": med det samme når status skifter til completed
  IF (TG_OP = 'UPDATE')
     AND NEW.status = 'completed'
     AND COALESCE(OLD.status,'') <> 'completed' THEN
    INSERT INTO public.customer_notification_queue
      (business_id, order_id, route_stop_id, event_type, recipient_email, send_at)
    VALUES
      (v_order.business_id, v_order.id, NEW.id, 'service_completed', v_order.customer_email, now())
    ON CONFLICT (order_id, event_type) DO UPDATE
      SET send_at = now(),
          route_stop_id = EXCLUDED.route_stop_id,
          status = 'pending';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_queue_customer_notifs ON public.route_stops;
CREATE TRIGGER trg_queue_customer_notifs
  AFTER INSERT OR UPDATE OF status, planned_arrival ON public.route_stops
  FOR EACH ROW EXECUTE FUNCTION public.queue_customer_notifications_for_stop();
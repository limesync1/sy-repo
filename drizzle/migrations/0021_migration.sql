
CREATE TABLE public.business_owner_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  kind text NOT NULL,
  ref text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  send_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, kind, ref)
);
GRANT SELECT ON public.business_owner_alerts TO authenticated;
GRANT ALL ON public.business_owner_alerts TO service_role;
ALTER TABLE public.business_owner_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read own alerts" ON public.business_owner_alerts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()));
CREATE INDEX business_owner_alerts_pending_idx ON public.business_owner_alerts (send_at) WHERE status = 'pending';

-- Ny bestilling fra kunde (ikke virksomhedens egne/manuelle eller genererede)
CREATE OR REPLACE FUNCTION public.enqueue_owner_alert_new_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_owner uuid;
BEGIN
  IF NEW.parent_order_id IS NOT NULL OR NEW.recurrence_cycle IS NOT NULL OR COALESCE(NEW.requires_customer_approval, false) THEN
    RETURN NEW;
  END IF;
  SELECT owner_id INTO v_owner FROM public.businesses WHERE id = NEW.business_id;
  IF auth.uid() IS NOT NULL AND (auth.uid() = v_owner OR EXISTS (
       SELECT 1 FROM public.employees e WHERE e.business_id = NEW.business_id AND e.user_id = auth.uid())) THEN
    RETURN NEW;
  END IF;
  -- Lille forsinkelse, så alle linjer i bestillingen er gemt før mailen bygges.
  INSERT INTO public.business_owner_alerts (business_id, kind, ref, payload, send_at)
  VALUES (NEW.business_id, 'new_order', NEW.id::text, jsonb_build_object('order_id', NEW.id), now() + interval '1 minute')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_owner_alert_new_order AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_owner_alert_new_order();

-- Ny anmeldelse
CREATE OR REPLACE FUNCTION public.enqueue_owner_alert_new_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO public.business_owner_alerts (business_id, kind, ref, payload)
  VALUES (NEW.business_id, 'new_review', NEW.id::text, jsonb_build_object('review_id', NEW.id))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_owner_alert_new_review AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_owner_alert_new_review();

-- Abonnement ændret af kunden (pause, opsigelse, genoptagelse, ny dato)
CREATE OR REPLACE FUNCTION public.enqueue_owner_alert_subscription_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_owner uuid; v_event text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  SELECT owner_id INTO v_owner FROM public.businesses WHERE id = NEW.business_id;
  IF auth.uid() = v_owner OR EXISTS (SELECT 1 FROM public.employees e WHERE e.business_id = NEW.business_id AND e.user_id = auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_event := CASE NEW.status WHEN 'paused' THEN 'paused' WHEN 'cancelled' THEN 'cancelled'
                 WHEN 'active' THEN CASE WHEN OLD.status = 'paused' THEN 'resumed' ELSE NULL END ELSE NULL END;
  ELSIF NEW.next_service_date IS DISTINCT FROM OLD.next_service_date THEN
    v_event := 'rescheduled';
  END IF;
  IF v_event IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.business_owner_alerts (business_id, kind, ref, payload)
  VALUES (NEW.business_id, 'subscription_change', NEW.id::text || ':' || v_event || ':' || extract(epoch from now())::bigint,
    jsonb_build_object('subscription_id', NEW.id, 'event', v_event))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_owner_alert_subscription_change AFTER UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_owner_alert_subscription_change();

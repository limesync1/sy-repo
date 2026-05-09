
-- =====================================================================
-- Phase 7b: billing model + monthly samlefaktura
-- =====================================================================

DO $$ BEGIN
  CREATE TYPE public.agreement_billing_model AS ENUM ('per_visit','monthly_consolidated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.agreements
  ADD COLUMN IF NOT EXISTS billing_model public.agreement_billing_model NOT NULL DEFAULT 'per_visit';

-- Update per-visit trigger to skip monthly-billed agreements
CREATE OR REPLACE FUNCTION public.enqueue_invoice_for_completed_occurrence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active boolean;
  v_paused timestamptz;
  v_model public.agreement_billing_model;
BEGIN
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN RETURN NEW; END IF;

  SELECT billing_model INTO v_model FROM public.agreements WHERE id = NEW.agreement_id;
  IF v_model = 'monthly_consolidated' THEN RETURN NEW; END IF;

  SELECT is_active, paused_until INTO v_active, v_paused
  FROM public.accounting_integrations WHERE business_id = NEW.business_id LIMIT 1;
  IF NOT COALESCE(v_active, false) THEN RETURN NEW; END IF;
  IF v_paused IS NOT NULL AND v_paused > now() THEN RETURN NEW; END IF;

  BEGIN
    INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation)
    VALUES (NEW.business_id, 'agreement_occurrence', NEW.id, 'invoice');
  EXCEPTION WHEN unique_violation THEN NULL; END;

  PERFORM public.kick_accounting_sync(NEW.business_id);
  RETURN NEW;
END;
$$;

-- Helper: enqueue one consolidated invoice job per agreement for a given month
CREATE OR REPLACE FUNCTION public.enqueue_monthly_consolidated_invoices(
  _business_id uuid,
  _year int,
  _month int
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  r record;
BEGIN
  IF NOT (public.is_business_owner(_business_id, auth.uid()) OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR r IN
    SELECT a.id AS agreement_id
    FROM public.agreements a
    WHERE a.business_id = _business_id
      AND a.billing_model = 'monthly_consolidated'
      AND EXISTS (
        SELECT 1 FROM public.agreement_occurrences o
        WHERE o.agreement_id = a.id
          AND o.status = 'completed'
          AND extract(year  from o.occurrence_date) = _year
          AND extract(month from o.occurrence_date) = _month
          AND o.invoice_external_id IS NULL
      )
  LOOP
    BEGIN
      INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation, payload)
      VALUES (_business_id, 'agreement_monthly_invoice', r.agreement_id, 'invoice',
              jsonb_build_object('year', _year, 'month', _month));
      v_count := v_count + 1;
    EXCEPTION WHEN unique_violation THEN NULL; END;
  END LOOP;

  PERFORM public.kick_accounting_sync(_business_id);
  RETURN v_count;
END;
$$;

-- =====================================================================
-- Phase 8: customer notifications driven by agreement_occurrences
-- =====================================================================

ALTER TABLE public.customer_notification_queue
  ALTER COLUMN order_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS agreement_occurrence_id uuid;

-- Replace previous unique index (order_id only) with two partial uniques
DROP INDEX IF EXISTS public.customer_notification_queue_unique;

CREATE UNIQUE INDEX IF NOT EXISTS customer_notif_queue_order_uniq
  ON public.customer_notification_queue (order_id, event_type, channel)
  WHERE order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS customer_notif_queue_occurrence_uniq
  ON public.customer_notification_queue (agreement_occurrence_id, event_type, channel)
  WHERE agreement_occurrence_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.queue_customer_notifications_for_occurrence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_agreement RECORD;
  v_business RECORD;
  v_default_minutes int;
  v_email_minutes int;
  v_sms_minutes int;
  v_send_at timestamptz;
  v_sms_enabled boolean;
BEGIN
  SELECT id, business_id, customer_email, customer_phone
    INTO v_agreement FROM public.agreements WHERE id = NEW.agreement_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT id, settings, notification_settings
    INTO v_business FROM public.businesses WHERE id = NEW.business_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  v_default_minutes := COALESCE(((v_business.settings->>'customer_notif_upcoming_hours')::int) * 60, 24 * 60);
  v_sms_enabled := COALESCE((v_business.settings->>'sms_enabled')::boolean, false);

  SELECT COALESCE(lead_time_minutes, v_default_minutes) INTO v_email_minutes
    FROM public.customer_notification_templates
   WHERE business_id = NEW.business_id AND event_type='service_upcoming' AND channel='email' LIMIT 1;
  v_email_minutes := COALESCE(v_email_minutes, v_default_minutes);

  SELECT COALESCE(lead_time_minutes, v_default_minutes) INTO v_sms_minutes
    FROM public.customer_notification_templates
   WHERE business_id = NEW.business_id AND event_type='service_upcoming' AND channel='sms' LIMIT 1;
  v_sms_minutes := COALESCE(v_sms_minutes, v_default_minutes);

  -- service_upcoming
  IF NEW.planned_arrival IS NOT NULL AND NEW.status = 'planned' THEN
    IF v_agreement.customer_email IS NOT NULL THEN
      v_send_at := NEW.planned_arrival - (v_email_minutes || ' minutes')::interval;
      IF v_send_at < now() THEN v_send_at := now(); END IF;
      INSERT INTO public.customer_notification_queue
        (business_id, agreement_occurrence_id, event_type, channel, recipient_email, send_at)
      VALUES
        (NEW.business_id, NEW.id, 'service_upcoming', 'email', v_agreement.customer_email, v_send_at)
      ON CONFLICT (agreement_occurrence_id, event_type, channel) WHERE agreement_occurrence_id IS NOT NULL
      DO UPDATE SET send_at = EXCLUDED.send_at, status = 'pending';
    END IF;
    IF v_sms_enabled AND v_agreement.customer_phone IS NOT NULL THEN
      v_send_at := NEW.planned_arrival - (v_sms_minutes || ' minutes')::interval;
      IF v_send_at < now() THEN v_send_at := now(); END IF;
      INSERT INTO public.customer_notification_queue
        (business_id, agreement_occurrence_id, event_type, channel, recipient_phone, send_at)
      VALUES
        (NEW.business_id, NEW.id, 'service_upcoming', 'sms', v_agreement.customer_phone, v_send_at)
      ON CONFLICT (agreement_occurrence_id, event_type, channel) WHERE agreement_occurrence_id IS NOT NULL
      DO UPDATE SET send_at = EXCLUDED.send_at, status = 'pending';
    END IF;
  END IF;

  -- service_completed
  IF (TG_OP = 'UPDATE') AND NEW.status = 'completed' AND COALESCE(OLD.status,'planned') <> 'completed' THEN
    IF v_agreement.customer_email IS NOT NULL THEN
      INSERT INTO public.customer_notification_queue
        (business_id, agreement_occurrence_id, event_type, channel, recipient_email, send_at)
      VALUES
        (NEW.business_id, NEW.id, 'service_completed', 'email', v_agreement.customer_email, now())
      ON CONFLICT (agreement_occurrence_id, event_type, channel) WHERE agreement_occurrence_id IS NOT NULL
      DO UPDATE SET send_at = now(), status = 'pending';
    END IF;
    IF v_sms_enabled AND v_agreement.customer_phone IS NOT NULL THEN
      INSERT INTO public.customer_notification_queue
        (business_id, agreement_occurrence_id, event_type, channel, recipient_phone, send_at)
      VALUES
        (NEW.business_id, NEW.id, 'service_completed', 'sms', v_agreement.customer_phone, now())
      ON CONFLICT (agreement_occurrence_id, event_type, channel) WHERE agreement_occurrence_id IS NOT NULL
      DO UPDATE SET send_at = now(), status = 'pending';
    END IF;
  END IF;

  -- Annullér i kø hvis forekomsten aflyses
  IF (TG_OP = 'UPDATE') AND NEW.status = 'cancelled' AND COALESCE(OLD.status,'planned') <> 'cancelled' THEN
    UPDATE public.customer_notification_queue
       SET status = 'cancelled', last_error = 'Forekomst aflyst'
     WHERE agreement_occurrence_id = NEW.id AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_queue_customer_notifications_for_occurrence ON public.agreement_occurrences;
CREATE TRIGGER trg_queue_customer_notifications_for_occurrence
AFTER INSERT OR UPDATE OF planned_arrival, status ON public.agreement_occurrences
FOR EACH ROW
EXECUTE FUNCTION public.queue_customer_notifications_for_occurrence();

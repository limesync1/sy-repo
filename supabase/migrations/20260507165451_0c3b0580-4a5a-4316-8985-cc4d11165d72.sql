
-- Tilføj felter til orders til at spore rykker, kreditering og annullering
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_reminder_type text,
  ADD COLUMN IF NOT EXISTS reminder_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS credit_note_external_id text,
  ADD COLUMN IF NOT EXISTS credit_note_external_number text,
  ADD COLUMN IF NOT EXISTS credited_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_at timestamptz;

-- Allow service-role and triggers to write reminder_history; client writes are blocked by existing prevent_client_payment_writes trigger
-- Extend the prevent trigger to also lock reminder_count + reminder_history (always sourced from accounting program)
CREATE OR REPLACE FUNCTION public.prevent_client_payment_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR auth.role() = 'service_role'
     OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.payment_status := NULL;
    NEW.paid_at := NULL;
    NEW.paid_amount := NULL;
    NEW.payment_status_synced_at := NULL;
    NEW.reminder_count := 0;
    NEW.reminder_history := '[]'::jsonb;
    NEW.last_reminder_at := NULL;
    NEW.last_reminder_type := NULL;
    NEW.credit_note_external_id := NULL;
    NEW.credit_note_external_number := NULL;
    NEW.credited_at := NULL;
    NEW.voided_at := NULL;
    RETURN NEW;
  END IF;

  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN NEW.payment_status := OLD.payment_status; END IF;
  IF NEW.paid_at IS DISTINCT FROM OLD.paid_at THEN NEW.paid_at := OLD.paid_at; END IF;
  IF NEW.paid_amount IS DISTINCT FROM OLD.paid_amount THEN NEW.paid_amount := OLD.paid_amount; END IF;
  IF NEW.payment_status_synced_at IS DISTINCT FROM OLD.payment_status_synced_at THEN NEW.payment_status_synced_at := OLD.payment_status_synced_at; END IF;
  IF NEW.reminder_count IS DISTINCT FROM OLD.reminder_count THEN NEW.reminder_count := OLD.reminder_count; END IF;
  IF NEW.reminder_history IS DISTINCT FROM OLD.reminder_history THEN NEW.reminder_history := OLD.reminder_history; END IF;
  IF NEW.last_reminder_at IS DISTINCT FROM OLD.last_reminder_at THEN NEW.last_reminder_at := OLD.last_reminder_at; END IF;
  IF NEW.last_reminder_type IS DISTINCT FROM OLD.last_reminder_type THEN NEW.last_reminder_type := OLD.last_reminder_type; END IF;
  IF NEW.credit_note_external_id IS DISTINCT FROM OLD.credit_note_external_id THEN NEW.credit_note_external_id := OLD.credit_note_external_id; END IF;
  IF NEW.credit_note_external_number IS DISTINCT FROM OLD.credit_note_external_number THEN NEW.credit_note_external_number := OLD.credit_note_external_number; END IF;
  IF NEW.credited_at IS DISTINCT FROM OLD.credited_at THEN NEW.credited_at := OLD.credited_at; END IF;
  IF NEW.voided_at IS DISTINCT FROM OLD.voided_at THEN NEW.voided_at := OLD.voided_at; END IF;
  RETURN NEW;
END;
$function$;

-- Tillad action-jobs i sync-køen (send_reminder, void_invoice, credit_invoice, mark_paid)
-- Disse hentes som almindelige operations men har ekstra metadata i payload-feltet hvis nødvendigt
ALTER TABLE public.accounting_sync_queue
  ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(business_id, payment_status) WHERE payment_status IS NOT NULL;

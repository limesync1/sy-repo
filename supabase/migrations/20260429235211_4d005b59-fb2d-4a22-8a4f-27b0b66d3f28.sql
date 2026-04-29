-- ─── Field-level shadow state ──────────────────────────────────────────
-- Holder den senest synkroniserede værdi pr. (entitet, felt) så vi kan
-- sende kun ændrede felter til regnskabsprogrammet og dermed undgå at
-- overskrive nyere data der er rettet derovre.
CREATE TABLE IF NOT EXISTS public.accounting_field_state (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL,
  provider text NOT NULL,
  entity_type text NOT NULL,           -- 'customer' | 'product' | 'order'
  entity_id uuid NOT NULL,
  field_name text NOT NULL,
  field_value jsonb,                   -- sidst kendte værdi (vores SoT)
  remote_value jsonb,                  -- sidst modtagne værdi fra provider
  last_pushed_at timestamptz,
  last_pulled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, provider, entity_type, entity_id, field_name)
);

CREATE INDEX IF NOT EXISTS idx_field_state_lookup
  ON public.accounting_field_state(business_id, provider, entity_type, entity_id);

ALTER TABLE public.accounting_field_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view their field state"
  ON public.accounting_field_state FOR SELECT
  USING (EXISTS (SELECT 1 FROM businesses b
                 WHERE b.id = business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Admins manage all field state"
  ON public.accounting_field_state FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_field_state_updated_at
  BEFORE UPDATE ON public.accounting_field_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Debounced kick (én HTTP-kald pr. transaktion pr. business) ────────
-- Bruger en transaktions-lokal GUC til at huske hvilke businesses der
-- allerede er blevet "kicket" i denne transaktion, så batch-opdateringer
-- kun afføder ét edge function-kald.
CREATE OR REPLACE FUNCTION public.kick_accounting_sync(_business_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'net'
AS $$
DECLARE
  v_url text := 'https://gkectsellkpltrxvusot.supabase.co/functions/v1/accounting-sync';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZWN0c2VsbGtwbHRyeHZ1c290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMTkxMDYsImV4cCI6MjA5MTU5NTEwNn0.VxLbs00qkZXCiNa468aHEC9FJhoY3Gyik0D8dKBdq_c';
  v_marker text;
  v_already text;
BEGIN
  -- Transaktions-scoped marker: "acct_kick:<business_id>" sættes første
  -- gang i en transaktion. Næste kald inden for samme tx er no-op.
  v_marker := 'acct_kick.' || replace(_business_id::text, '-', '_');
  BEGIN
    v_already := current_setting('serviceydere.' || v_marker, true);
  EXCEPTION WHEN OTHERS THEN
    v_already := NULL;
  END;
  IF v_already = '1' THEN
    RETURN;
  END IF;
  PERFORM set_config('serviceydere.' || v_marker, '1', true); -- true = local to tx

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_anon,
      'Authorization', 'Bearer ' || v_anon
    ),
    body := jsonb_build_object(
      'business_id', _business_id,
      'mode', 'queue',
      'internal_mode', true
    )
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- 1) Health-state på integrationen
ALTER TABLE public.accounting_integrations
  ADD COLUMN IF NOT EXISTS consecutive_failures int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paused_until timestamptz,
  ADD COLUMN IF NOT EXISTS last_kick_at timestamptz;

-- 2) Hård unik constraint så samme entitet ikke kan have flere aktive jobs
CREATE UNIQUE INDEX IF NOT EXISTS uq_sync_queue_active_entity
  ON public.accounting_sync_queue (business_id, entity_type, entity_id)
  WHERE status IN ('pending', 'processing');

-- 3) Re-skriv kick_accounting_sync med rate-limit + health-check
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
  v_paused_until timestamptz;
  v_last_kick timestamptz;
  v_active boolean;
BEGIN
  -- Transaktions-scoped marker: kun ét kald pr. transaktion
  v_marker := 'acct_kick.' || replace(_business_id::text, '-', '_');
  BEGIN
    v_already := current_setting('serviceydere.' || v_marker, true);
  EXCEPTION WHEN OTHERS THEN
    v_already := NULL;
  END;
  IF v_already = '1' THEN RETURN; END IF;
  PERFORM set_config('serviceydere.' || v_marker, '1', true);

  -- Sundheds-tjek: skip hvis integration er pauset eller inaktiv
  SELECT is_active, paused_until, last_kick_at
    INTO v_active, v_paused_until, v_last_kick
  FROM public.accounting_integrations
  WHERE business_id = _business_id
  LIMIT 1;

  IF NOT COALESCE(v_active, false) THEN RETURN; END IF;
  IF v_paused_until IS NOT NULL AND v_paused_until > now() THEN RETURN; END IF;

  -- HÅRD RATE-LIMIT: max ét kick pr. 10 sekunder pr. business
  IF v_last_kick IS NOT NULL AND v_last_kick > now() - interval '10 seconds' THEN
    RETURN;
  END IF;

  -- Marker kick-tidspunkt FØR HTTP-kald (også hvis kald fejler)
  UPDATE public.accounting_integrations
     SET last_kick_at = now()
   WHERE business_id = _business_id;

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

-- 4) Trigger der auto-pauser efter for mange fejl i træk
CREATE OR REPLACE FUNCTION public.auto_pause_failing_integration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_failures int;
BEGIN
  IF NEW.status = 'error' THEN
    UPDATE public.accounting_integrations
       SET consecutive_failures = consecutive_failures + 1
     WHERE business_id = NEW.business_id
     RETURNING consecutive_failures INTO v_failures;

    -- Efter 10 fejl i træk: pause i 30 min
    IF v_failures >= 10 THEN
      UPDATE public.accounting_integrations
         SET paused_until = now() + interval '30 minutes',
             consecutive_failures = 0,
             last_error = 'Auto-paused after 10 consecutive failures',
             last_error_at = now()
       WHERE business_id = NEW.business_id;
    END IF;
  ELSIF NEW.status = 'success' THEN
    -- Nulstil tæller på succes
    UPDATE public.accounting_integrations
       SET consecutive_failures = 0,
           paused_until = NULL
     WHERE business_id = NEW.business_id
       AND (consecutive_failures > 0 OR paused_until IS NOT NULL);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_pause_failing_integration ON public.accounting_sync_log;
CREATE TRIGGER trg_auto_pause_failing_integration
AFTER INSERT ON public.accounting_sync_log
FOR EACH ROW EXECUTE FUNCTION public.auto_pause_failing_integration();

-- 5) Auto-cleanup af log: behold maks 200 rækker pr. business
CREATE OR REPLACE FUNCTION public.cleanup_accounting_sync_log()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.accounting_sync_log
   WHERE id IN (
     SELECT id FROM (
       SELECT id, ROW_NUMBER() OVER (PARTITION BY business_id ORDER BY created_at DESC) as rn
       FROM public.accounting_sync_log
     ) t WHERE rn > 200
   );
END;
$$;

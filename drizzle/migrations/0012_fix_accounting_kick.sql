CREATE OR REPLACE FUNCTION public.kick_accounting_sync(_business_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'net', 'internal'
AS $function$
DECLARE
  v_url text := 'https://gkectsellkpltrxvusot.supabase.co/functions/v1/accounting-sync';
  v_token text;
  v_marker text;
  v_paused_until timestamptz;
  v_last_kick timestamptz;
  v_active boolean;
BEGIN
  -- Gyldigt indstillingsnavn: navnet skal starte med et bogstav, også når
  -- virksomhedens id starter med et tal.
  v_marker := 'serviceydere.acct_kick_' || replace(_business_id::text, '-', '');
  IF current_setting(v_marker, true) = '1' THEN RETURN; END IF;
  PERFORM set_config(v_marker, '1', true);

  SELECT is_active, paused_until, last_kick_at
    INTO v_active, v_paused_until, v_last_kick
  FROM public.accounting_integrations
  WHERE business_id = _business_id
  LIMIT 1;

  IF NOT COALESCE(v_active, false) THEN RETURN; END IF;
  IF v_paused_until IS NOT NULL AND v_paused_until > now() THEN RETURN; END IF;
  IF v_last_kick IS NOT NULL AND v_last_kick > now() - interval '10 seconds' THEN RETURN; END IF;

  -- Serverens planlægningsnøgle ligger kun i databasen og godkendes af
  -- accounting-sync som en betroet serverkalder.
  SELECT token INTO v_token FROM internal.cron_tokens WHERE id = 1;
  IF v_token IS NULL THEN
    RAISE WARNING 'kick_accounting_sync: missing server token for %', _business_id;
    RETURN;
  END IF;

  UPDATE public.accounting_integrations
     SET last_kick_at = now()
   WHERE business_id = _business_id;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_token
    ),
    body := jsonb_build_object(
      'business_id', _business_id,
      'mode', 'queue',
      'internal_mode', true
    ),
    timeout_milliseconds := 30000
  );
EXCEPTION WHEN OTHERS THEN
  -- Må aldrig blokere gemning af kunder/aftaler; køen samles op af den
  -- faste kørsel. Fejlen logges i stedet for at forsvinde.
  RAISE WARNING 'kick_accounting_sync failed for %: %', _business_id, SQLERRM;
END;
$function$;

REVOKE ALL ON FUNCTION public.kick_accounting_sync(uuid) FROM PUBLIC, anon, authenticated;
DO $migration$
DECLARE
  fn record;
  definition text;
BEGIN
  FOR fn IN
    SELECT p.oid, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND p.proname IN ('interval_to_duration', 'auto_recur_due_orders', '_handle_order_stop_completion', 'auto_recur_hourly_test_orders', 'auto_create_subscription_from_item')
      AND pg_get_functiondef(p.oid) LIKE '%every_1_hour_test%'
  LOOP
    definition := pg_get_functiondef(fn.oid);
    IF fn.proname = 'interval_to_duration' THEN
      definition := replace(definition, 'BEGIN', E'BEGIN\n  IF _interval = ''every_30_minutes_test'' THEN RETURN interval ''30 minutes''; END IF;');
    ELSE
      definition := regexp_replace(definition, '(r\.interval|s\.interval|v_interval|interval) <> ''every_1_hour_test''', '\1 NOT IN (''every_1_hour_test'', ''every_30_minutes_test'')', 'g');
      definition := regexp_replace(definition, '(r\.interval|s\.interval|v_interval|interval)\s*=\s*''every_1_hour_test''', '\1 IN (''every_1_hour_test'', ''every_30_minutes_test'')', 'g');
    END IF;
    EXECUTE definition;
  END LOOP;
END;
$migration$;
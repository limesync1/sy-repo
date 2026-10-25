DO $migration$
DECLARE fn record; definition text;
BEGIN
  FOR fn IN
    SELECT p.oid, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prokind='f'
      AND p.proname IN ('interval_to_duration','auto_recur_due_orders','_apply_completion_handle','auto_recur_hourly_test_orders','auto_create_subscription_from_item')
  LOOP
    definition := pg_get_functiondef(fn.oid);
    IF fn.proname = 'interval_to_duration' THEN
      definition := replace(definition, 'BEGIN', E'BEGIN\n  IF _interval = ''every_5_minutes_test'' THEN RETURN interval ''5 minutes''; END IF;');
    ELSE
      definition := replace(definition, '''every_1_hour_test'', ''every_30_minutes_test''', '''every_1_hour_test'', ''every_30_minutes_test'', ''every_5_minutes_test''');
    END IF;
    EXECUTE definition;
  END LOOP;
END;
$migration$;
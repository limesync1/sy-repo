DO $migration$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef('public._apply_completion_handle(public.route_stops)'::regprocedure) INTO definition;
  definition := replace(definition, 'v_interval <> ''every_1_hour_test''', 'v_interval NOT IN (''every_1_hour_test'', ''every_30_minutes_test'')');
  EXECUTE definition;
END;
$migration$;
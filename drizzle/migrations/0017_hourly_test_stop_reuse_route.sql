DO $mig$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.auto_recur_due_orders'::regproc);
  d := replace(d,
'    IF v_route_id IS NOT NULL THEN
      SELECT COALESCE(MAX(sequence), 0) + 1',
'    IF v_route_id IS NOT NULL THEN
      -- Testinterval: tidligere udførte stop på samme rute må ikke blokere næste times stop.
      IF r.interval = ''every_1_hour_test'' THEN
        UPDATE public.route_stops SET subscription_id = NULL
         WHERE route_id = v_route_id AND subscription_id = r.id AND status = ''completed'';
      END IF;
      SELECT COALESCE(MAX(sequence), 0) + 1');
  IF position('Testinterval: tidligere' in d) = 0 THEN RAISE EXCEPTION 'patch not applied'; END IF;
  EXECUTE d;
END
$mig$;
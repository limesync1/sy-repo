-- lovable-cron-fallback-reviewed: temporary hourly test interval needs next occurrence within minutes of being due; removed with the test interval
DO $$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.auto_recur_due_orders()'::regprocedure);
  d := replace(d, $r$AND s.interval <> 'engangskøb'
     FOR UPDATE SKIP LOCKED$r$, $r$AND s.interval <> 'engangskøb'
       AND (coalesce(current_setting('serviceydere.recur_only_hourly_test', true), '') <> 'on' OR s.interval = 'every_1_hour_test')
     FOR UPDATE SKIP LOCKED$r$);
  IF position('recur_only_hourly_test' in d) = 0 THEN RAISE EXCEPTION 'auto_recur patch failed'; END IF;
  EXECUTE d;

  d := pg_get_functiondef('public.auto_create_subscription_from_item()'::regprocedure);
  d := replace(d, $r$WHERE id=NEW.order_id AND parent_order_id IS NOT NULL)$r$, $r$WHERE id=NEW.order_id AND parent_order_id IS NOT NULL AND parent_order_id <> id)$r$);
  IF position('parent_order_id <> id' in d) = 0 THEN RAISE EXCEPTION 'sub patch failed'; END IF;
  EXECUTE d;
END $$;

CREATE OR REPLACE FUNCTION public.auto_recur_hourly_test_orders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $f$
DECLARE n int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE status='active' AND interval='every_1_hour_test' AND next_service_date <= now()) THEN RETURN 0; END IF;
  PERFORM set_config('serviceydere.recur_only_hourly_test', 'on', true);
  SELECT count(*) INTO n FROM public.auto_recur_due_orders();
  PERFORM set_config('serviceydere.recur_only_hourly_test', '', true);
  RETURN n;
END $f$;
REVOKE ALL ON FUNCTION public.auto_recur_hourly_test_orders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_recur_hourly_test_orders() TO service_role;

SELECT cron.schedule('hourly-test-recurrence-every-5-min', '*/5 * * * *', 'SELECT public.auto_recur_hourly_test_orders();');

INSERT INTO public.subscriptions (business_id, customer_id, customer_email, customer_name, service_id, order_id, service_name, interval, status, details, total_price, next_service_date, preferred_route_id)
SELECT o.business_id, o.customer_id, lower(o.customer_email), o.customer_name, oi.service_id, o.id, oi.service_name, 'every_1_hour_test', 'active', oi.details, oi.total_price, o.next_service_date, rs.route_id
FROM public.orders o JOIN public.order_items oi ON oi.order_id=o.id
LEFT JOIN public.route_stops rs ON rs.order_id=o.id
WHERE o.id='b892a8c9-ecb4-4a89-8c63-cb320031ec97'
  AND NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.order_id=o.id);
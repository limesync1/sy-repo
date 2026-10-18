DO $$ DECLARE d text; BEGIN
SELECT pg_get_functiondef('public.interval_to_duration(text)'::regprocedure) INTO d;
d:=replace(d,'BEGIN','BEGIN' || E'\n  IF _interval = ''every_1_hour_test'' THEN RETURN interval ''1 hour''; END IF;'); EXECUTE d;
SELECT pg_get_functiondef('public._apply_completion_handle(public.route_stops)'::regprocedure) INTO d;
d:=replace(d,'IF v_next_local::date <= v_completed_local::date THEN','IF v_interval <> ''every_1_hour_test'' AND v_next_local::date <= v_completed_local::date THEN'); EXECUTE d;
SELECT pg_get_functiondef('public.auto_create_subscription_from_item()'::regprocedure) INTO d;
d:=replace(d,'IF NOT FOUND OR v_order.status = ''cancelled'' THEN RETURN NEW; END IF;',E'IF NOT FOUND OR v_order.status = ''cancelled'' THEN RETURN NEW; END IF;\n  IF v_interval = ''every_1_hour_test'' AND EXISTS (SELECT 1 FROM public.orders WHERE id=NEW.order_id AND parent_order_id IS NOT NULL) THEN RETURN NEW; END IF;'); EXECUTE d;
SELECT pg_get_functiondef('public.auto_recur_due_orders()'::regprocedure) INTO d;
d:=replace(d,'IF v_source_order.status NOT IN (''completed'',''confirmed'') THEN','IF (r.interval = ''every_1_hour_test'' AND v_source_order.status <> ''completed'') OR v_source_order.status NOT IN (''completed'',''confirmed'') THEN');
d:=replace(d,'IF v_next_local::date <= v_due_local::date THEN','IF r.interval <> ''every_1_hour_test'' AND v_next_local::date <= v_due_local::date THEN');
d:=replace(d,'IF EXISTS (' || E'\n      SELECT 1\n      FROM public.orders o\n      JOIN public.route_stops', 'IF r.interval <> ''every_1_hour_test'' AND EXISTS (' || E'\n      SELECT 1\n      FROM public.orders o\n      JOIN public.route_stops');
d:=replace(d,'IF v_agreement_id IS NOT NULL THEN','IF v_agreement_id IS NOT NULL AND r.interval <> ''every_1_hour_test'' THEN');
d:=replace(d,'COALESCE(v_source_order.preferred_time_start, (v_due_at AT TIME ZONE ''Europe/Copenhagen'')::time)','CASE WHEN r.interval = ''every_1_hour_test'' THEN (v_due_at AT TIME ZONE ''Europe/Copenhagen'')::time ELSE COALESCE(v_source_order.preferred_time_start, (v_due_at AT TIME ZONE ''Europe/Copenhagen'')::time) END');
EXECUTE d;
END $$;
COMMENT ON FUNCTION public.auto_recur_due_orders() IS 'Temporary exact every_1_hour_test uses distinct completed-order cycles; all ordinary recurrence caps remain unchanged.';
CREATE POLICY accounting_documents_server_only ON storage.objects FOR ALL TO service_role USING (bucket_id='accounting-documents') WITH CHECK (bucket_id='accounting-documents');
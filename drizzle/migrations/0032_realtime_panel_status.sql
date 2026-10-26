DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['business_owner_alerts','customer_notification_queue','accounting_sync_log','accounting_sync_queue','accounting_sync_dlq','invoice_batches','employee_completed_stops'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=t AND c.relkind='r' AND c.relrowsecurity) THEN
      RAISE EXCEPTION 'Realtime table % requires existing row security', t;
    END IF;
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
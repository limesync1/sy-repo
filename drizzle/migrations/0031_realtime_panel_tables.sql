DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['services','private_customers','business_customers','employees','order_items','reviews','quote_request_matches','route_stop_assignees','route_employees','employee_absences'] LOOP
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.agreements; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.agreement_occurrences; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
ALTER TABLE public.agreements REPLICA IDENTITY FULL;
ALTER TABLE public.agreement_occurrences REPLICA IDENTITY FULL;
ALTER TABLE public.routes REPLICA IDENTITY FULL;
ALTER TABLE public.route_stops REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
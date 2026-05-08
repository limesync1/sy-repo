DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='routes') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.routes';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='route_stops') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.route_stops';
  END IF;
END $$;

ALTER TABLE public.routes REPLICA IDENTITY FULL;
ALTER TABLE public.route_stops REPLICA IDENTITY FULL;
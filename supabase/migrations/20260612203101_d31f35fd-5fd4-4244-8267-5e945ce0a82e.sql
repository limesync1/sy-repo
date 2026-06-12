CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule('materialize-next-occurrences-nightly');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'materialize-next-occurrences-nightly',
  '0 3 * * *',
  $cron$
    SELECT net.http_post(
      url := 'https://gkectsellkpltrxvusot.supabase.co/functions/v1/materialize-next-occurrences',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZWN0c2VsbGtwbHRyeHZ1c290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMTkxMDYsImV4cCI6MjA5MTU5NTEwNn0.VxLbs00qkZXCiNa468aHEC9FJhoY3Gyik0D8dKBdq_c',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZWN0c2VsbGtwbHRyeHZ1c290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMTkxMDYsImV4cCI6MjA5MTU5NTEwNn0.VxLbs00qkZXCiNa468aHEC9FJhoY3Gyik0D8dKBdq_c'
      ),
      body := jsonb_build_object('source', 'pg_cron')
    );
  $cron$
);
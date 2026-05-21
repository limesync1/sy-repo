
-- Trin 23: admin_health_extended — top DB tables, pg_cron jobs, storage buckets
CREATE OR REPLACE FUNCTION public.admin_health_extended()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_top_tables jsonb;
  v_cron_jobs jsonb;
  v_buckets jsonb;
  v_has_cron boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Top 10 tables by total size (heap + indexes + toast)
  SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'bytes')::bigint DESC), '[]'::jsonb)
  INTO v_top_tables
  FROM (
    SELECT jsonb_build_object(
      'schema', schemaname,
      'name', relname,
      'bytes', pg_total_relation_size(C.oid),
      'rows', n_live_tup
    ) AS t
    FROM pg_stat_user_tables S
    JOIN pg_class C ON C.relname = S.relname AND C.relnamespace = (
      SELECT oid FROM pg_namespace WHERE nspname = S.schemaname
    )
    WHERE schemaname IN ('public')
    ORDER BY pg_total_relation_size(C.oid) DESC
    LIMIT 10
  ) sub;

  -- Detect pg_cron extension
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') INTO v_has_cron;
  IF v_has_cron THEN
    EXECUTE $sql$
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'jobid', j.jobid,
        'jobname', j.jobname,
        'schedule', j.schedule,
        'active', j.active,
        'command', LEFT(j.command, 200),
        'last_run_at', r.start_time,
        'last_status', r.status
      ) ORDER BY j.jobname), '[]'::jsonb)
      FROM cron.job j
      LEFT JOIN LATERAL (
        SELECT start_time, status FROM cron.job_run_details
        WHERE jobid = j.jobid ORDER BY start_time DESC NULLS LAST LIMIT 1
      ) r ON true
    $sql$ INTO v_cron_jobs;
  ELSE
    v_cron_jobs := '[]'::jsonb;
  END IF;

  -- Storage buckets with byte + object counts
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', b.id,
    'name', b.name,
    'public', b.public,
    'created_at', b.created_at,
    'objects', COALESCE(o.cnt, 0),
    'bytes', COALESCE(o.bytes, 0)
  ) ORDER BY COALESCE(o.bytes, 0) DESC), '[]'::jsonb)
  INTO v_buckets
  FROM storage.buckets b
  LEFT JOIN (
    SELECT bucket_id,
           COUNT(*) AS cnt,
           COALESCE(SUM((metadata->>'size')::bigint), 0) AS bytes
    FROM storage.objects
    GROUP BY bucket_id
  ) o ON o.bucket_id = b.id;

  RETURN jsonb_build_object(
    'top_tables', v_top_tables,
    'cron_jobs', v_cron_jobs,
    'has_cron', v_has_cron,
    'buckets', v_buckets,
    'generated_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_health_extended() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_health_extended() TO authenticated;

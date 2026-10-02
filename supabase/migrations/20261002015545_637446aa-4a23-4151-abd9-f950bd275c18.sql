CREATE OR REPLACE FUNCTION public.admin_list_orders(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_search text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_filter text DEFAULT 'all'::text, p_sort text DEFAULT 'newest'::text, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total bigint;
  v_gmv numeric;
  v_rows jsonb;
  v_counts jsonb;
  v_now timestamptz := now();
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  CREATE TEMP TABLE _o ON COMMIT DROP AS
  SELECT o.*, b.name AS business_name, b.slug AS business_slug
  FROM public.orders o
  LEFT JOIN public.businesses b ON b.id = o.business_id
  WHERE (p_from IS NULL OR o.created_at >= p_from)
    AND (p_to   IS NULL OR o.created_at <= p_to)
    AND (p_status IS NULL OR p_status = 'all' OR o.status::text = p_status)
    AND (
      p_filter IS NULL OR p_filter = 'all'
      OR (p_filter = 'today'    AND o.created_at::date = v_now::date)
      OR (p_filter = 'week'     AND o.created_at >= v_now - interval '7 days')
      OR (p_filter = 'overdue'  AND o.due_date IS NOT NULL AND o.due_date < v_now::date AND (o.payment_status IS NULL OR o.payment_status::text NOT IN ('paid','credited','void')))
      OR (p_filter = 'unpaid'   AND (o.payment_status IS NULL OR o.payment_status::text NOT IN ('paid','credited','void')))
      OR (p_filter = 'credited' AND o.payment_status::text = 'credited')
      OR (p_filter = 'unpaid7'  AND o.created_at < v_now - interval '7 days' AND (o.payment_status IS NULL OR o.payment_status::text NOT IN ('paid','credited','void')))
    )
    AND (
      p_search IS NULL OR p_search = '' OR
      o.customer_name  ILIKE '%'||p_search||'%' OR
      o.customer_email ILIKE '%'||p_search||'%' OR
      COALESCE(b.name,'') ILIKE '%'||p_search||'%' OR
      COALESCE(o.invoice_external_number,'') ILIKE '%'||p_search||'%'
    );

  SELECT COUNT(*), COALESCE(SUM(total_amount),0) INTO v_total, v_gmv FROM _o;

  SELECT jsonb_build_object(
    'overdue',  COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date < v_now::date AND (payment_status IS NULL OR payment_status::text NOT IN ('paid','credited','void'))),
    'unpaid',   COUNT(*) FILTER (WHERE (payment_status IS NULL OR payment_status::text NOT IN ('paid','credited','void'))),
    'unpaid7',  COUNT(*) FILTER (WHERE created_at < v_now - interval '7 days' AND (payment_status IS NULL OR payment_status::text NOT IN ('paid','credited','void'))),
    'credited', COUNT(*) FILTER (WHERE payment_status::text = 'credited'),
    'today',    COUNT(*) FILTER (WHERE created_at::date = v_now::date),
    'week',     COUNT(*) FILTER (WHERE created_at >= v_now - interval '7 days')
  ) INTO v_counts FROM _o;

  EXECUTE format($f$
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
      SELECT id, created_at, customer_name, customer_email, customer_phone,
             business_id, business_name, business_slug,
             status::text AS status, payment_status::text AS payment_status,
             total_amount, due_date, paid_at, invoice_status,
             invoice_external_id, invoice_external_number
      FROM _o
      ORDER BY %s
      LIMIT %s OFFSET %s
    ) t
  $f$,
    CASE p_sort
      WHEN 'oldest'        THEN 'created_at ASC'
      WHEN 'amount_desc'   THEN 'total_amount DESC NULLS LAST'
      WHEN 'amount_asc'    THEN 'total_amount ASC NULLS LAST'
      WHEN 'due_asc'       THEN 'due_date ASC NULLS LAST'
      WHEN 'customer'      THEN 'customer_name ASC'
      ELSE 'created_at DESC'
    END,
    p_limit, p_offset
  ) INTO v_rows;

  RETURN jsonb_build_object(
    'total', v_total,
    'gmv', v_gmv,
    'counts', v_counts,
    'rows', v_rows
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_health_extended()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_top_tables jsonb;
  v_cron_jobs jsonb;
  v_buckets jsonb;
  v_has_cron boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'bytes')::bigint DESC), '[]'::jsonb)
  INTO v_top_tables
  FROM (
    SELECT jsonb_build_object(
      'schema', S.schemaname,
      'name', S.relname,
      'bytes', pg_total_relation_size(S.relid),
      'rows', S.n_live_tup
    ) AS t
    FROM pg_stat_user_tables S
    WHERE S.schemaname IN ('public')
    ORDER BY pg_total_relation_size(S.relid) DESC
    LIMIT 10
  ) sub;

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
$function$;
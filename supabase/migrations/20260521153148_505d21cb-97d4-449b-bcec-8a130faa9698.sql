
-- Admin orders list RPC with server-side paging, search, filter, sort
CREATE OR REPLACE FUNCTION public.admin_list_orders(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_filter text DEFAULT 'all',
  p_sort text DEFAULT 'newest',
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total bigint;
  v_gmv numeric;
  v_rows jsonb;
  v_counts jsonb;
  v_now timestamptz := now();
BEGIN
  IF NOT public.has_role(auth.uid(), 'platform_admin') THEN
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
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_orders(integer,integer,text,text,text,text,timestamptz,timestamptz) TO authenticated;

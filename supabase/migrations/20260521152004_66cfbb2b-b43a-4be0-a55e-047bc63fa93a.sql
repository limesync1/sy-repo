CREATE OR REPLACE FUNCTION public.admin_overview_snapshot(
  p_from timestamptz,
  p_to   timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_from timestamptz;
  v_prev_to   timestamptz;
  v_range_days int;
  v_result jsonb;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_range_days := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (p_to - p_from)) / 86400)::int);
  v_prev_to   := p_from;
  v_prev_from := p_from - (p_to - p_from);

  WITH
  o_curr AS (
    SELECT id, created_at, total_amount, status, business_id, customer_email
    FROM orders WHERE created_at >= p_from AND created_at <= p_to
  ),
  o_prev AS (
    SELECT total_amount FROM orders
    WHERE created_at >= v_prev_from AND created_at < v_prev_to
  ),
  p_curr AS (
    SELECT id, created_at FROM profiles WHERE created_at >= p_from AND created_at <= p_to
  ),
  p_prev AS (
    SELECT id FROM profiles WHERE created_at >= v_prev_from AND created_at < v_prev_to
  ),
  b_curr AS (
    SELECT id, created_at FROM businesses WHERE created_at >= p_from AND created_at <= p_to
  ),
  b_prev AS (
    SELECT id FROM businesses WHERE created_at >= v_prev_from AND created_at < v_prev_to
  ),
  totals AS (
    SELECT
      (SELECT COUNT(*) FROM businesses) AS businesses_total,
      (SELECT COUNT(*) FROM profiles)   AS profiles_total,
      (SELECT COUNT(*) FROM reviews)    AS reviews_total,
      (SELECT COALESCE(AVG(rating), 0) FROM reviews) AS reviews_avg,
      (SELECT COALESCE(SUM(total_price), 0) FROM subscriptions WHERE status = 'active') AS mrr,
      (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') AS active_subs
  ),
  kpis AS (
    SELECT
      COALESCE(SUM(total_amount), 0) AS gmv,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END), 0) AS gmv_completed,
      COUNT(*) AS orders_count,
      CASE WHEN COUNT(*) > 0 THEN AVG(total_amount) ELSE 0 END AS avg_order
    FROM o_curr
  ),
  prev_kpis AS (
    SELECT COALESCE(SUM(total_amount), 0) AS gmv_prev, COUNT(*) AS orders_prev FROM o_prev
  ),
  series AS (
    SELECT to_char(d::date, 'YYYY-MM-DD') AS date,
           COALESCE((SELECT COUNT(*) FROM o_curr o WHERE o.created_at::date = d::date), 0)::int AS orders,
           COALESCE((SELECT SUM(total_amount) FROM o_curr o WHERE o.created_at::date = d::date), 0) AS gmv,
           COALESCE((SELECT COUNT(*) FROM p_curr p WHERE p.created_at::date = d::date), 0)::int AS users,
           COALESCE((SELECT COUNT(*) FROM b_curr b WHERE b.created_at::date = d::date), 0)::int AS businesses
    FROM generate_series(p_from::date, p_to::date, '1 day'::interval) d
  ),
  dow AS (
    SELECT EXTRACT(DOW FROM created_at)::int AS dow, COUNT(*) AS c
    FROM o_curr GROUP BY 1
  ),
  -- Top kategorier på tværs af hele platformen (identitet, ikke periode)
  cats AS (
    SELECT category AS label, COUNT(*)::int AS value
    FROM businesses
    WHERE category IS NOT NULL AND category <> ''
    GROUP BY category ORDER BY value DESC LIMIT 8
  ),
  cities AS (
    SELECT city AS label, COUNT(*)::int AS value
    FROM businesses
    WHERE city IS NOT NULL AND city <> ''
    GROUP BY city ORDER BY value DESC LIMIT 8
  ),
  top_biz AS (
    SELECT b.id, b.name, COALESCE(SUM(o.total_amount), 0) AS revenue
    FROM o_curr o
    LEFT JOIN businesses b ON b.id = o.business_id
    WHERE o.business_id IS NOT NULL
    GROUP BY b.id, b.name
    ORDER BY revenue DESC LIMIT 6
  ),
  top_customers AS (
    SELECT customer_email AS name, COALESCE(SUM(total_amount), 0) AS spend
    FROM o_curr
    WHERE customer_email IS NOT NULL
    GROUP BY customer_email
    ORDER BY spend DESC LIMIT 6
  ),
  repeat_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE n > 0)  AS unique_customers,
      COUNT(*) FILTER (WHERE n > 1)  AS repeat_customers
    FROM (
      SELECT customer_email, COUNT(*) AS n FROM o_curr
      WHERE customer_email IS NOT NULL GROUP BY customer_email
    ) t
  )
  SELECT jsonb_build_object(
    'range', jsonb_build_object(
      'from', p_from, 'to', p_to, 'days', v_range_days,
      'prev_from', v_prev_from, 'prev_to', v_prev_to
    ),
    'kpis', (SELECT jsonb_build_object(
      'gmv', gmv, 'gmv_completed', gmv_completed,
      'orders', orders_count, 'avg_order', avg_order
    ) FROM kpis),
    'prev', (SELECT jsonb_build_object(
      'gmv', gmv_prev, 'orders', orders_prev,
      'users', (SELECT COUNT(*) FROM p_prev),
      'businesses', (SELECT COUNT(*) FROM b_prev)
    ) FROM prev_kpis),
    'period_counts', jsonb_build_object(
      'new_users', (SELECT COUNT(*) FROM p_curr),
      'new_businesses', (SELECT COUNT(*) FROM b_curr)
    ),
    'totals', (SELECT to_jsonb(t) FROM totals t),
    'series', (SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.date), '[]'::jsonb) FROM series s),
    'dow', (SELECT COALESCE(jsonb_agg(jsonb_build_object('dow', dow, 'count', c)), '[]'::jsonb) FROM dow),
    'top_categories', (SELECT COALESCE(jsonb_agg(to_jsonb(c)), '[]'::jsonb) FROM cats c),
    'top_cities', (SELECT COALESCE(jsonb_agg(to_jsonb(c)), '[]'::jsonb) FROM cities c),
    'top_businesses', (SELECT COALESCE(jsonb_agg(to_jsonb(b)), '[]'::jsonb) FROM top_biz b),
    'top_customers', (SELECT COALESCE(jsonb_agg(to_jsonb(c)), '[]'::jsonb) FROM top_customers c),
    'repeat', (SELECT to_jsonb(r) FROM repeat_stats r)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_overview_snapshot(timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_overview_snapshot(timestamptz, timestamptz) TO authenticated;
CREATE OR REPLACE FUNCTION public.admin_list_businesses(p_search text DEFAULT NULL::text, p_filter text DEFAULT 'all'::text, p_sort text DEFAULT 'created_desc'::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total bigint;
  v_rows jsonb;
  v_counts jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  WITH base AS (
    SELECT
      b.id, b.name, b.slug, b.category, b.city, b.email, b.phone,
      b.logo_url, b.is_verified, b.is_active, b.created_at,
      p.status AS plan_status,
      p.monthly_price_dkk,
      p.trial_ends_at,
      p.stripe_payment_method_brand,
      p.stripe_payment_method_last4,
      (p.stripe_payment_method_last4 IS NOT NULL) AS has_card,
      CASE WHEN p.trial_ends_at IS NULL THEN NULL
           ELSE CEIL(EXTRACT(EPOCH FROM (p.trial_ends_at - now())) / 86400)::int
      END AS days_left,
      (SELECT COUNT(*) FROM orders o WHERE o.business_id = b.id) AS orders_count,
      (SELECT COALESCE(SUM(total_amount),0) FROM orders o WHERE o.business_id = b.id) AS total_revenue,
      (SELECT COUNT(*) FROM orders o WHERE o.business_id = b.id AND o.status = 'pending') AS pending_count,
      (SELECT MAX(created_at) FROM orders o WHERE o.business_id = b.id) AS last_order_at,
      (SELECT u.email FROM auth.users u WHERE u.id = b.owner_id) AS owner_email,
      (SELECT u.last_sign_in_at FROM auth.users u WHERE u.id = b.owner_id) AS owner_last_login
    FROM businesses b
    LEFT JOIN business_plans p ON p.business_id = b.id
  ),
  classified AS (
    SELECT *,
      CASE
        WHEN has_card AND is_active THEN 'active_paying'
        WHEN NOT has_card AND days_left IS NOT NULL AND days_left > 0 AND days_left <= 3 THEN 'trial_expiring'
        WHEN NOT has_card AND days_left IS NOT NULL AND days_left > 0 THEN 'trial'
        WHEN NOT has_card AND days_left IS NOT NULL AND days_left <= 0 THEN 'expired_no_card'
        ELSE 'other'
      END AS bucket
    FROM base
  ),
  filtered AS (
    SELECT * FROM classified c
    WHERE
      (p_search IS NULL OR p_search = '' OR
        c.name ILIKE '%'||p_search||'%' OR
        c.city ILIKE '%'||p_search||'%' OR
        c.email ILIKE '%'||p_search||'%' OR
        c.category ILIKE '%'||p_search||'%' OR
        c.owner_email ILIKE '%'||p_search||'%')
      AND (
        p_filter = 'all'
        OR (p_filter = 'active_paying' AND bucket = 'active_paying')
        OR (p_filter = 'trial' AND bucket IN ('trial','trial_expiring'))
        OR (p_filter = 'trial_expiring' AND bucket = 'trial_expiring')
        OR (p_filter = 'expired_no_card' AND bucket = 'expired_no_card')
        OR (p_filter = 'inactive' AND NOT is_active)
        OR (p_filter = 'unverified' AND NOT is_verified)
        OR (p_filter = 'no_orders' AND orders_count = 0)
        OR (p_filter = 'no_login' AND owner_last_login IS NULL)
      )
  ),
  counted AS (
    SELECT COUNT(*) AS n FROM filtered
  ),
  bucket_counts AS (
    SELECT
      (SELECT COUNT(*) FROM classified) AS all_n,
      (SELECT COUNT(*) FROM classified WHERE bucket = 'active_paying') AS active_paying,
      (SELECT COUNT(*) FROM classified WHERE bucket IN ('trial','trial_expiring')) AS trial,
      (SELECT COUNT(*) FROM classified WHERE bucket = 'trial_expiring') AS trial_expiring,
      (SELECT COUNT(*) FROM classified WHERE bucket = 'expired_no_card') AS expired_no_card,
      (SELECT COUNT(*) FROM classified WHERE NOT is_active) AS inactive,
      (SELECT COUNT(*) FROM classified WHERE NOT is_verified) AS unverified,
      (SELECT COUNT(*) FROM classified WHERE orders_count = 0) AS no_orders,
      (SELECT COUNT(*) FROM classified WHERE owner_last_login IS NULL) AS no_login
  ),
  paged AS (
    SELECT * FROM filtered
    ORDER BY
      CASE WHEN p_sort = 'created_desc' THEN created_at END DESC NULLS LAST,
      CASE WHEN p_sort = 'created_asc' THEN created_at END ASC NULLS LAST,
      CASE WHEN p_sort = 'revenue_desc' THEN total_revenue END DESC NULLS LAST,
      CASE WHEN p_sort = 'orders_desc' THEN orders_count END DESC NULLS LAST,
      CASE WHEN p_sort = 'last_order_desc' THEN last_order_at END DESC NULLS LAST,
      CASE WHEN p_sort = 'last_login_desc' THEN owner_last_login END DESC NULLS LAST,
      CASE WHEN p_sort = 'name_asc' THEN name END ASC NULLS LAST,
      created_at DESC
    LIMIT GREATEST(LEAST(p_limit, 200), 1)
    OFFSET GREATEST(p_offset, 0)
  )
  SELECT
    (SELECT n FROM counted),
    COALESCE(jsonb_agg(to_jsonb(paged)), '[]'::jsonb),
    to_jsonb((SELECT bc FROM bucket_counts bc))
  INTO v_total, v_rows, v_counts
  FROM paged;

  RETURN jsonb_build_object(
    'total', COALESCE(v_total, 0),
    'rows', COALESCE(v_rows, '[]'::jsonb),
    'counts', COALESCE(v_counts, '{}'::jsonb)
  );
END;
$function$;
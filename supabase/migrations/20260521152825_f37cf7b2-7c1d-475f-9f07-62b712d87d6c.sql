
CREATE OR REPLACE FUNCTION public.admin_list_users_v2(
  p_search text DEFAULT NULL,
  p_role_filter text DEFAULT 'all',
  p_activity_filter text DEFAULT 'all',
  p_sort text DEFAULT 'created_desc',
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
      u.id AS user_id,
      u.email,
      u.created_at AS auth_created_at,
      u.last_sign_in_at,
      COALESCE(p.display_name, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name') AS display_name,
      COALESCE(p.phone, u.phone) AS phone,
      p.avatar_url,
      COALESCE(ARRAY(SELECT role::text FROM user_roles WHERE user_id = u.id ORDER BY role), ARRAY[]::text[]) AS roles,
      (SELECT COUNT(*) FROM orders WHERE customer_id = u.id) AS orders_count,
      (SELECT COUNT(*) FROM businesses WHERE owner_id = u.id) AS businesses_count
    FROM auth.users u
    LEFT JOIN profiles p ON p.user_id = u.id
  ),
  classified AS (
    SELECT *,
      CASE
        WHEN last_sign_in_at IS NULL THEN 'never_login'
        WHEN last_sign_in_at < now() - interval '90 days' THEN 'inactive_90'
        WHEN last_sign_in_at < now() - interval '30 days' THEN 'inactive_30'
        WHEN last_sign_in_at >= now() - interval '7 days' THEN 'active_7'
        ELSE 'active_other'
      END AS activity_bucket
    FROM base
  ),
  filtered AS (
    SELECT * FROM classified c
    WHERE
      (p_search IS NULL OR p_search = '' OR
        c.email ILIKE '%'||p_search||'%' OR
        c.display_name ILIKE '%'||p_search||'%' OR
        c.phone ILIKE '%'||p_search||'%')
      AND (
        p_role_filter = 'all'
        OR (p_role_filter = 'admin' AND 'admin' = ANY(c.roles))
        OR (p_role_filter = 'business_owner' AND 'business_owner' = ANY(c.roles))
        OR (p_role_filter = 'user' AND array_length(c.roles, 1) IS NULL)
      )
      AND (
        p_activity_filter = 'all'
        OR (p_activity_filter = 'active_7' AND activity_bucket = 'active_7')
        OR (p_activity_filter = 'never_login' AND activity_bucket = 'never_login')
        OR (p_activity_filter = 'inactive_30' AND activity_bucket IN ('inactive_30','inactive_90'))
        OR (p_activity_filter = 'inactive_90' AND activity_bucket = 'inactive_90')
        OR (p_activity_filter = 'no_orders' AND orders_count = 0)
      )
  ),
  counted AS (SELECT COUNT(*) AS n FROM filtered),
  bucket_counts AS (
    SELECT
      (SELECT COUNT(*) FROM classified) AS all_n,
      (SELECT COUNT(*) FROM classified WHERE 'admin' = ANY(roles)) AS admins,
      (SELECT COUNT(*) FROM classified WHERE 'business_owner' = ANY(roles)) AS owners,
      (SELECT COUNT(*) FROM classified WHERE activity_bucket = 'active_7') AS active_7,
      (SELECT COUNT(*) FROM classified WHERE activity_bucket = 'never_login') AS never_login,
      (SELECT COUNT(*) FROM classified WHERE activity_bucket IN ('inactive_30','inactive_90')) AS inactive_30,
      (SELECT COUNT(*) FROM classified WHERE activity_bucket = 'inactive_90') AS inactive_90,
      (SELECT COUNT(*) FROM classified WHERE orders_count = 0) AS no_orders
  ),
  paged AS (
    SELECT * FROM filtered
    ORDER BY
      CASE WHEN p_sort = 'created_desc' THEN auth_created_at END DESC NULLS LAST,
      CASE WHEN p_sort = 'created_asc' THEN auth_created_at END ASC NULLS LAST,
      CASE WHEN p_sort = 'last_login_desc' THEN last_sign_in_at END DESC NULLS LAST,
      CASE WHEN p_sort = 'orders_desc' THEN orders_count END DESC NULLS LAST,
      CASE WHEN p_sort = 'email_asc' THEN email END ASC NULLS LAST,
      auth_created_at DESC
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
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users_v2(text,text,text,text,int,int) TO authenticated;

-- Aktivitetstidslinje: seneste ordrer, virksomheder oprettet, audit-events for én bruger
CREATE OR REPLACE FUNCTION public.admin_user_activity_timeline(
  p_user_id uuid,
  p_limit int DEFAULT 50
)
RETURNS TABLE(
  event_at timestamptz,
  kind text,
  title text,
  detail text,
  ref_id text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  (
    SELECT o.created_at, 'order'::text,
           ('Ordre placeret · ' || COALESCE(o.status::text, '?'))::text,
           (COALESCE(o.total_amount::text, '0') || ' kr')::text,
           o.id::text
    FROM orders o WHERE o.customer_id = p_user_id
  )
  UNION ALL
  (
    SELECT b.created_at, 'business'::text,
           ('Virksomhed oprettet: ' || b.name)::text,
           COALESCE(b.city, '')::text,
           b.id::text
    FROM businesses b WHERE b.owner_id = p_user_id
  )
  UNION ALL
  (
    SELECT al.created_at, 'audit'::text,
           al.action::text,
           COALESCE(al.entity_type, '')::text,
           COALESCE(al.entity_id::text, '')
    FROM admin_audit_log al
    WHERE al.target_user_id = p_user_id OR al.actor_user_id = p_user_id
  )
  ORDER BY event_at DESC
  LIMIT GREATEST(LEAST(p_limit, 200), 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_user_activity_timeline(uuid,int) TO authenticated;

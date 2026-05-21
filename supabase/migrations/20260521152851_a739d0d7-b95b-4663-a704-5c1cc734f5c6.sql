
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
           COALESCE(al.target_label, al.target_type, '')::text,
           COALESCE(al.target_id::text, '')
    FROM admin_audit_log al
    WHERE al.target_id = p_user_id OR al.admin_id = p_user_id
  )
  ORDER BY event_at DESC
  LIMIT GREATEST(LEAST(p_limit, 200), 1);
END;
$$;

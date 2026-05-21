
CREATE OR REPLACE FUNCTION public.admin_email_send_log(
  p_limit int DEFAULT 200,
  p_template text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_since timestamptz DEFAULT NULL
)
RETURNS TABLE (
  message_id text,
  template_name text,
  recipient_email text,
  status text,
  error_message text,
  created_at timestamptz,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  WITH latest AS (
    SELECT DISTINCT ON (e.message_id)
      e.message_id, e.template_name, e.recipient_email, e.status,
      e.error_message, e.created_at, e.metadata
    FROM email_send_log e
    WHERE e.message_id IS NOT NULL
      AND (p_since IS NULL OR e.created_at >= p_since)
    ORDER BY e.message_id, e.created_at DESC
  )
  SELECT * FROM latest l
  WHERE (p_template IS NULL OR l.template_name = p_template)
    AND (p_status IS NULL OR l.status = p_status)
    AND (
      p_search IS NULL OR p_search = '' OR
      l.recipient_email ILIKE '%' || p_search || '%' OR
      l.template_name ILIKE '%' || p_search || '%'
    )
  ORDER BY l.created_at DESC
  LIMIT greatest(1, least(p_limit, 1000));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_email_distinct_templates()
RETURNS TABLE (template_name text, n bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT e.template_name, count(*) AS n
  FROM email_send_log e
  WHERE e.template_name IS NOT NULL
  GROUP BY e.template_name
  ORDER BY n DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_suppressed_emails(p_limit int DEFAULT 200)
RETURNS TABLE (id uuid, email text, reason text, created_at timestamptz, metadata jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT s.id, s.email, s.reason, s.created_at, s.metadata
  FROM suppressed_emails s
  ORDER BY s.created_at DESC
  LIMIT greatest(1, least(p_limit, 1000));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_email_send_log(int, text, text, text, timestamptz) FROM public;
REVOKE ALL ON FUNCTION public.admin_email_distinct_templates() FROM public;
REVOKE ALL ON FUNCTION public.admin_suppressed_emails(int) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_email_send_log(int, text, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_email_distinct_templates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_suppressed_emails(int) TO authenticated;

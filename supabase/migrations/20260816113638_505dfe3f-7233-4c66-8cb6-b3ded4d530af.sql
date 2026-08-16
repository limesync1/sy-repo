ALTER TABLE public.route_audit_log
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS summary text;

CREATE OR REPLACE FUNCTION public.log_route_audit(
  p_business_id uuid,
  p_action text,
  p_route_id uuid DEFAULT NULL,
  p_agreement_id uuid DEFAULT NULL,
  p_scope text DEFAULT NULL,
  p_affected_count integer DEFAULT 0,
  p_summary text DEFAULT NULL,
  p_before jsonb DEFAULT NULL,
  p_after jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_headers json;
  v_ip text;
  v_ua text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  -- Kun ejeren eller en medarbejder i samme virksomhed må skrive i logget.
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.owner_id = v_uid
    UNION ALL
    SELECT 1 FROM public.employees e WHERE e.business_id = p_business_id AND e.user_id = v_uid
  ) THEN
    RETURN NULL;
  END IF;

  BEGIN
    v_headers := current_setting('request.headers', true)::json;
  EXCEPTION WHEN others THEN
    v_headers := NULL;
  END;

  IF v_headers IS NOT NULL THEN
    v_ip := split_part(coalesce(v_headers ->> 'cf-connecting-ip', v_headers ->> 'x-forwarded-for', ''), ',', 1);
    v_ua := v_headers ->> 'user-agent';
  END IF;

  INSERT INTO public.route_audit_log (
    business_id, actor_id, route_id, agreement_id, action, scope,
    affected_count, before_data, after_data, ip_address, user_agent, summary
  ) VALUES (
    p_business_id, v_uid, p_route_id, p_agreement_id, p_action, p_scope,
    coalesce(p_affected_count, 0), p_before, p_after,
    nullif(btrim(coalesce(v_ip, '')), ''), nullif(v_ua, ''), nullif(btrim(coalesce(p_summary, '')), '')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_route_audit(uuid, text, uuid, uuid, text, integer, text, jsonb, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.log_route_audit(uuid, text, uuid, uuid, text, integer, text, jsonb, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.route_audit_feed(p_route_id uuid, p_limit integer DEFAULT 100)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  action text,
  scope text,
  affected_count integer,
  summary text,
  actor_id uuid,
  actor_name text,
  actor_email text,
  actor_role text,
  ip_address text,
  user_agent text,
  before_data jsonb,
  after_data jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_business uuid;
  v_is_owner boolean := false;
  v_allowed boolean := false;
BEGIN
  IF v_uid IS NULL OR p_route_id IS NULL THEN
    RETURN;
  END IF;

  SELECT r.business_id INTO v_business FROM public.routes r WHERE r.id = p_route_id;
  IF v_business IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = v_business AND b.owner_id = v_uid)
    INTO v_is_owner;

  v_allowed := v_is_owner OR EXISTS (
    SELECT 1 FROM public.employees e WHERE e.business_id = v_business AND e.user_id = v_uid
  );
  IF NOT v_allowed THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.created_at,
    l.action,
    l.scope,
    l.affected_count,
    l.summary,
    l.actor_id,
    coalesce(e.name, p.display_name)                          AS actor_name,
    CASE WHEN v_is_owner THEN e.email ELSE NULL END           AS actor_email,
    CASE
      WHEN l.actor_id IS NULL THEN 'system'
      WHEN l.actor_id = b.owner_id THEN 'owner'
      WHEN e.id IS NOT NULL THEN 'employee'
      ELSE 'user'
    END                                                       AS actor_role,
    CASE WHEN v_is_owner THEN l.ip_address ELSE NULL END      AS ip_address,
    CASE WHEN v_is_owner THEN l.user_agent ELSE NULL END      AS user_agent,
    l.before_data,
    l.after_data
  FROM public.route_audit_log l
  JOIN public.businesses b ON b.id = l.business_id
  LEFT JOIN public.employees e ON e.user_id = l.actor_id AND e.business_id = l.business_id
  LEFT JOIN public.profiles p ON p.user_id = l.actor_id
  WHERE l.route_id = p_route_id
  ORDER BY l.created_at DESC
  LIMIT greatest(1, least(coalesce(p_limit, 100), 300));
END;
$$;

REVOKE ALL ON FUNCTION public.route_audit_feed(uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.route_audit_feed(uuid, integer) TO authenticated;
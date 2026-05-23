
-- 1) security_findings table
CREATE TABLE IF NOT EXISTS public.security_findings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scanner_name TEXT NOT NULL,
  internal_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical','high','medium','low','info')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','ignored','fixed','accepted_risk')),
  justification TEXT,
  affected_resource TEXT,
  updated_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scanner_name, internal_id)
);

ALTER TABLE public.security_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security findings"
ON public.security_findings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert security findings"
ON public.security_findings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update security findings"
ON public.security_findings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete security findings"
ON public.security_findings FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_security_findings_updated_at
BEFORE UPDATE ON public.security_findings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) admin_security_overview() RPC
CREATE OR REPLACE FUNCTION public.admin_security_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  v_tables jsonb;
  v_functions jsonb;
  v_buckets jsonb;
  v_findings jsonb;
  v_counts jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Tables: rls + policy counts per operation
  WITH t AS (
    SELECT c.oid, c.relname AS name, c.relrowsecurity AS rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  ),
  p AS (
    SELECT
      pol.polrelid,
      COUNT(*) FILTER (WHERE pol.polcmd = 'r') AS sel,
      COUNT(*) FILTER (WHERE pol.polcmd = 'a') AS ins,
      COUNT(*) FILTER (WHERE pol.polcmd = 'w') AS upd,
      COUNT(*) FILTER (WHERE pol.polcmd = 'd') AS del,
      COUNT(*) FILTER (WHERE pol.polcmd = '*') AS all_cmd,
      COUNT(*) AS total
    FROM pg_policy pol
    GROUP BY pol.polrelid
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', t.name,
      'rls_enabled', t.rls_enabled,
      'policies_total', COALESCE(p.total,0),
      'select_policies', COALESCE(p.sel,0) + COALESCE(p.all_cmd,0),
      'insert_policies', COALESCE(p.ins,0) + COALESCE(p.all_cmd,0),
      'update_policies', COALESCE(p.upd,0) + COALESCE(p.all_cmd,0),
      'delete_policies', COALESCE(p.del,0) + COALESCE(p.all_cmd,0)
    ) ORDER BY t.name
  )
  INTO v_tables
  FROM t LEFT JOIN p ON p.polrelid = t.oid;

  -- Functions: security definer + search_path config
  WITH fns AS (
    SELECT
      p.proname AS name,
      p.prosecdef AS security_definer,
      EXISTS(
        SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) c
        WHERE c ILIKE 'search_path=%'
      ) AS has_search_path
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  )
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'security_definer', COUNT(*) FILTER (WHERE security_definer),
    'definer_missing_search_path', COUNT(*) FILTER (WHERE security_definer AND NOT has_search_path),
    'missing_list', COALESCE(jsonb_agg(name ORDER BY name) FILTER (WHERE security_definer AND NOT has_search_path), '[]'::jsonb)
  )
  INTO v_functions
  FROM fns;

  -- Storage buckets
  SELECT jsonb_agg(
    jsonb_build_object('id', id, 'name', name, 'public', public) ORDER BY name
  ) INTO v_buckets
  FROM storage.buckets;

  -- Findings summary
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'open', COUNT(*) FILTER (WHERE status = 'open'),
    'ignored', COUNT(*) FILTER (WHERE status = 'ignored'),
    'fixed', COUNT(*) FILTER (WHERE status = 'fixed'),
    'accepted_risk', COUNT(*) FILTER (WHERE status = 'accepted_risk'),
    'critical_open', COUNT(*) FILTER (WHERE status = 'open' AND severity IN ('critical','high'))
  ) INTO v_findings
  FROM public.security_findings;

  -- Aggregate counts
  SELECT jsonb_build_object(
    'tables_total', (SELECT jsonb_array_length(v_tables)),
    'tables_with_rls', (
      SELECT COUNT(*) FROM jsonb_array_elements(v_tables) e WHERE (e->>'rls_enabled')::boolean
    ),
    'tables_without_rls', (
      SELECT COUNT(*) FROM jsonb_array_elements(v_tables) e WHERE NOT (e->>'rls_enabled')::boolean
    ),
    'tables_no_policies', (
      SELECT COUNT(*) FROM jsonb_array_elements(v_tables) e WHERE (e->>'policies_total')::int = 0
    ),
    'public_buckets', (
      SELECT COUNT(*) FROM jsonb_array_elements(COALESCE(v_buckets,'[]'::jsonb)) e WHERE (e->>'public')::boolean
    ),
    'private_buckets', (
      SELECT COUNT(*) FROM jsonb_array_elements(COALESCE(v_buckets,'[]'::jsonb)) e WHERE NOT (e->>'public')::boolean
    )
  ) INTO v_counts;

  result := jsonb_build_object(
    'generated_at', now(),
    'counts', v_counts,
    'tables', v_tables,
    'functions', v_functions,
    'buckets', COALESCE(v_buckets, '[]'::jsonb),
    'findings_summary', v_findings
  );
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_security_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_security_overview() TO authenticated;

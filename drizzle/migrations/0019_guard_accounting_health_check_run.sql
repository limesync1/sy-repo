ALTER FUNCTION public.accounting_health_check_run() RENAME TO _accounting_health_check_run_impl;
REVOKE ALL ON FUNCTION public._accounting_health_check_run_impl() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._accounting_health_check_run_impl() TO service_role;

CREATE OR REPLACE FUNCTION public.accounting_health_check_run()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Kun platformadministratorer kan køre regnskabstjekket' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NULL AND coalesce(auth.role(), '') NOT IN ('service_role') AND current_user NOT IN ('postgres','supabase_admin') THEN
    RAISE EXCEPTION 'Ikke tilladt' USING ERRCODE = '42501';
  END IF;
  RETURN public._accounting_health_check_run_impl();
END;
$$;
REVOKE ALL ON FUNCTION public.accounting_health_check_run() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accounting_health_check_run() TO authenticated, service_role;
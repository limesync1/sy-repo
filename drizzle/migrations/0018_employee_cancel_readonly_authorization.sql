CREATE OR REPLACE FUNCTION public.employee_can_cancel_appointment(_stop_id uuid, _order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE c record;
BEGIN
  SELECT * INTO c FROM public._employee_stop_context(_stop_id);
  RETURN c.order_id IS NOT NULL AND c.order_id = _order_id;
END;
$$;
REVOKE ALL ON FUNCTION public.employee_can_cancel_appointment(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.employee_can_cancel_appointment(uuid, uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.employee_can_cancel_appointment(uuid, uuid) IS 'Read-only cancellation preflight under the caller identity. Preserves private stop context authorization and validates the exact order before accounting side effects.';
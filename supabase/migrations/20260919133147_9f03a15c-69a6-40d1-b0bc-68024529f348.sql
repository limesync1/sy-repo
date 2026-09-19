REVOKE EXECUTE ON FUNCTION public.is_route_assigned_employee(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_route_assigned_employee(uuid, uuid) TO service_role;
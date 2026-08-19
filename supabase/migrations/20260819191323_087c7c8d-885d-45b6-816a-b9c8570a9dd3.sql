GRANT EXECUTE ON FUNCTION public.is_business_owner(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_route_owner(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_route_assigned_employee(uuid, uuid) TO authenticated, anon;
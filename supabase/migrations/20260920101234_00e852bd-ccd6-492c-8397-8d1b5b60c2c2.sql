GRANT EXECUTE ON FUNCTION public.is_route_assigned_employee(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.business_daily_capacity(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.routes_with_skill_mismatch(uuid, date, date) TO authenticated;
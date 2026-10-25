-- assert_route_safely_deleted kaldes fra ruteplanlæggeren efter fletninger
-- (authenticated) og fra server-jobs (service_role), men manglede EXECUTE-grant.
GRANT EXECUTE ON FUNCTION public.assert_route_safely_deleted(uuid) TO authenticated, service_role;
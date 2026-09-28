ALTER FUNCTION public.reopen_completed_route_for_new_work() SECURITY DEFINER;
REVOKE ALL ON FUNCTION public.reopen_completed_route_for_new_work() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reopen_completed_route_for_new_work() FROM anon;
REVOKE ALL ON FUNCTION public.reopen_completed_route_for_new_work() FROM authenticated;
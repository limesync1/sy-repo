ALTER FUNCTION public.reopen_completed_route_for_new_work() SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.reopen_completed_route_for_new_work() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reopen_completed_route_for_new_work() FROM anon;
REVOKE ALL ON FUNCTION public.reopen_completed_route_for_new_work() FROM authenticated;

ALTER FUNCTION public.reopen_route(uuid) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.reopen_route(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reopen_route(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.reopen_route(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_route(uuid) TO service_role;

ALTER FUNCTION public.undo_completed_route_stop(uuid) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.undo_completed_route_stop(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.undo_completed_route_stop(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.undo_completed_route_stop(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.undo_completed_route_stop(uuid) TO service_role;
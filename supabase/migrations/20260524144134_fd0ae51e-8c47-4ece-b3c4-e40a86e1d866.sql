REVOKE ALL ON FUNCTION public.materialize_virtual_route(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.materialize_virtual_route(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.materialize_virtual_route(uuid, date) TO service_role;
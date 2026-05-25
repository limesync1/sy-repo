REVOKE EXECUTE ON FUNCTION public.materialize_virtual_route(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.materialize_virtual_route(uuid, date) TO service_role;
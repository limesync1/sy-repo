-- Lad sandkassens testrolle køre regressionstestene for rute-fletning/flytning.
GRANT EXECUTE ON FUNCTION public.assert_route_safely_deleted(uuid) TO sandbox_exec;
GRANT EXECUTE ON FUNCTION public.move_route_to_date(uuid, date, text) TO sandbox_exec;
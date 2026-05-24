REVOKE ALL ON FUNCTION public._agreement_interval_duration(public.agreement_interval, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._agreement_occurs_on_route_date(public.agreement_interval, integer, date, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._materialize_occurrence_on_route(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_next_agreement_occurrence(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_route_stop_completion() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_order_for_new_occurrence() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_invoice_on_stop_completion() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.materialize_virtual_route(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.materialize_virtual_route(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.materialize_virtual_route(uuid, date) TO service_role;
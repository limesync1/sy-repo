CREATE OR REPLACE FUNCTION public.employee_cancel_appointment(_stop_id uuid, _credit_mode text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c record; v_occ uuid; v_order public.orders%rowtype;
BEGIN
IF _credit_mode NOT IN ('now','office') THEN RAISE EXCEPTION 'Vælg hvem der håndterer kreditnotaen'; END IF;
SELECT * INTO c FROM public._employee_stop_context(_stop_id);
SELECT agreement_occurrence_id INTO v_occ FROM public.route_stops WHERE id=_stop_id FOR UPDATE;
SELECT * INTO v_order FROM public.orders WHERE id=c.order_id FOR UPDATE;
IF v_order.id IS NULL THEN RAISE EXCEPTION 'Aftalen har ingen bestilling'; END IF;
IF _credit_mode='now' AND v_order.payment_status <> 'credited' THEN RAISE EXCEPTION 'Kreditnotaen skal være oprettet før annullering'; END IF;
IF c.stop_status='cancelled' THEN RETURN jsonb_build_object('cancelled',true); END IF;
UPDATE public.orders SET status='cancelled',updated_at=now() WHERE id=c.order_id;
UPDATE public.agreement_occurrences SET status='cancelled',updated_at=now() WHERE id=v_occ;
UPDATE public.route_stops SET status='cancelled',updated_at=now() WHERE id=_stop_id;
UPDATE public.stop_time_entries SET ended_at=now() WHERE stop_id=_stop_id AND ended_at IS NULL;
PERFORM public.add_employee_stop_note(_stop_id,CASE WHEN _credit_mode='now' THEN 'Aftalen er annulleret. Kreditnotaen er oprettet.' ELSE 'Aftalen er annulleret. Kontoret skal håndtere kreditnotaen.' END);
RETURN jsonb_build_object('cancelled',true,'credit_mode',_credit_mode);
END $$;
REVOKE ALL ON FUNCTION public.employee_cancel_appointment(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.employee_cancel_appointment(uuid,text) TO authenticated,service_role;
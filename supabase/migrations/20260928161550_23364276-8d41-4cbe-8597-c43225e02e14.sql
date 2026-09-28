CREATE OR REPLACE FUNCTION public.reopen_route(_route_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_business_id uuid; v_count int;
BEGIN
  SELECT business_id INTO v_business_id FROM public.routes WHERE id = _route_id;
  IF v_business_id IS NULL THEN RAISE EXCEPTION 'Route % not found', _route_id; END IF;
  IF NOT (public.is_business_owner(v_business_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.routes SET status = 'planned', updated_at = now() WHERE id = _route_id;
  UPDATE public.route_stops SET status = 'pending', completed_at = NULL, updated_at = now()
   WHERE route_id = _route_id AND status = 'completed';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.route_audit_log(business_id, route_id, action, affected_count)
  VALUES (v_business_id, _route_id, 'route.reopen', v_count);
END;
$function$;

CREATE OR REPLACE FUNCTION public.undo_completed_route_stop(_stop_id uuid)
 RETURNS void LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE v_route_id uuid; v_business_id uuid; v_status text;
BEGIN
  SELECT rs.route_id, r.business_id, rs.status INTO v_route_id, v_business_id, v_status
  FROM public.route_stops rs JOIN public.routes r ON r.id = rs.route_id
  WHERE rs.id = _stop_id FOR UPDATE OF rs, r;
  IF v_route_id IS NULL THEN RAISE EXCEPTION 'Stop not found'; END IF;
  IF NOT (public.is_business_owner(v_business_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_status <> 'completed' THEN RAISE EXCEPTION 'Stop is not completed'; END IF;
  UPDATE public.route_stops SET status = 'pending', completed_at = NULL, updated_at = now() WHERE id = _stop_id;
  UPDATE public.routes SET status = 'planned', updated_at = now() WHERE id = v_route_id AND status = 'completed';
  INSERT INTO public.route_audit_log(business_id, route_id, action, affected_count)
  VALUES (v_business_id, v_route_id, 'stop.completion_undone', 1);
END;
$function$;
CREATE OR REPLACE FUNCTION public.employee_route_placement_options(
  _stop_id uuid,
  _start_date date
)
RETURNS TABLE(id uuid, name text, route_date date, is_same_series boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  c record;
  source_route record;
BEGIN
  SELECT * INTO c FROM public._employee_stop_context(_stop_id);
  IF c.route_id IS NULL THEN RAISE EXCEPTION 'Stoppet har ingen rute'; END IF;
  SELECT r.id, r.base_route_id INTO source_route FROM public.routes r WHERE r.id = c.route_id;

  RETURN QUERY
  SELECT r.id, coalesce(r.name, 'Rute')::text, r.route_date,
    (coalesce(r.base_route_id, r.id) = coalesce(source_route.base_route_id, source_route.id))
  FROM public.routes r
  WHERE r.business_id = c.business_id
    AND r.route_date = _start_date
    AND r.status NOT IN ('completed', 'cancelled')
    AND public.is_route_assigned_employee(r.id, auth.uid())
  ORDER BY
    (coalesce(r.base_route_id, r.id) = coalesce(source_route.base_route_id, source_route.id)) DESC,
    r.name NULLS LAST,
    r.id;
END;
$$;

REVOKE ALL ON FUNCTION public.employee_route_placement_options(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.employee_route_placement_options(uuid, date) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.employee_create_order_from_stop_v2(
  _stop_id uuid,
  _item jsonb,
  _start_date date,
  _target_route_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  c record;
  src record;
  pr record;
  target_route record;
  v_id uuid := gen_random_uuid();
  v_seq integer;
  v_added boolean := false;
BEGIN
  SELECT * INTO c FROM public._employee_stop_context(_stop_id);
  IF c.order_id IS NULL THEN RAISE EXCEPTION 'Stoppet har ingen kunde at oprette en aftale for'; END IF;
  IF (_item->>'service_id') IS NULL THEN RAISE EXCEPTION 'Vælg en ydelse'; END IF;
  IF _start_date IS NULL OR _start_date < current_date - 1 OR _start_date > current_date + 730 THEN
    RAISE EXCEPTION 'Vælg en gyldig opstartsdato';
  END IF;

  SELECT * INTO src FROM public.orders WHERE id = c.order_id;
  SELECT * INTO pr FROM public._employee_price_item(c.business_id, (_item->>'service_id')::uuid, _item);

  IF _target_route_id IS NOT NULL THEN
    IF coalesce(pr.details->>'interval', 'engangskøb') <> 'engangskøb' THEN
      RAISE EXCEPTION 'Faste aftaler skal placeres af kontoret, så de lander på den rigtige rute';
    END IF;
    SELECT r.* INTO target_route
    FROM public.routes r
    WHERE r.id = _target_route_id
      AND r.business_id = c.business_id
      AND r.route_date = _start_date
      AND r.status NOT IN ('completed', 'cancelled')
      AND public.is_route_assigned_employee(r.id, auth.uid());
    IF target_route.id IS NULL THEN
      RAISE EXCEPTION 'Den valgte rute er ikke længere tilgængelig på datoen';
    END IF;
  END IF;

  INSERT INTO public.orders(id, parent_order_id, business_id, customer_id, customer_name, customer_email, customer_phone, address, zip_code, city,
    latitude, longitude, cvr, company_name, preferred_date, total_amount, status, requires_customer_approval, notes)
  VALUES (v_id, v_id, c.business_id, src.customer_id, src.customer_name, src.customer_email, src.customer_phone, src.address, src.zip_code, src.city,
    src.latitude, src.longitude, src.cvr, src.company_name, _start_date, round(pr.unit_price * pr.quantity, 2), 'confirmed', false,
    'Oprettet af medarbejder under rutekørsel');

  INSERT INTO public.order_items(order_id, service_id, service_name, quantity, unit_price, total_price, details)
  VALUES (v_id, (_item->>'service_id')::uuid, pr.service_name, pr.quantity, pr.unit_price, round(pr.unit_price * pr.quantity, 2), pr.details);

  IF target_route.id IS NOT NULL THEN
    SELECT coalesce(max(sequence), 0) + 1 INTO v_seq FROM public.route_stops WHERE route_id = target_route.id;
    INSERT INTO public.route_stops(route_id, order_id, sequence, status, address, latitude, longitude, customer_name, customer_phone, service_summary, assigned_employee_id)
    SELECT target_route.id, v_id, v_seq, 'pending', rs.address, rs.latitude, rs.longitude, rs.customer_name, rs.customer_phone,
      pr.service_name || ' × ' || trim(to_char(pr.quantity, 'FM999990.##')), c.employee_id
    FROM public.route_stops rs WHERE rs.id = c.stop_id;
    v_added := true;
  END IF;

  INSERT INTO public.employee_appointment_notes(business_id, stop_id, order_id, agreement_id, route_id, employee_id, author_user_id, kind, body)
  VALUES (c.business_id, c.stop_id, v_id, c.agreement_id, coalesce(target_route.id, c.route_id), c.employee_id, auth.uid(), 'services_changed',
    'Ny aftale oprettet: ' || pr.service_name || ' (' || coalesce(pr.details->>'interval','engangskøb') || ', start ' || to_char(_start_date,'DD-MM-YYYY') || ')'
    || CASE WHEN v_added THEN ' — tilføjet til valgt rute.' ELSE ' — ligger i Aftaler uden rute.' END);

  RETURN jsonb_build_object('order_id', v_id, 'added_to_route', v_added, 'target_route_id', target_route.id,
    'reason', CASE WHEN v_added THEN 'selected_route' WHEN coalesce(pr.details->>'interval','engangskøb') <> 'engangskøb' THEN 'recurring' ELSE 'unassigned' END,
    'total', round(pr.unit_price * pr.quantity, 2));
END;
$$;

REVOKE ALL ON FUNCTION public.employee_create_order_from_stop_v2(uuid, jsonb, date, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.employee_create_order_from_stop_v2(uuid, jsonb, date, uuid) TO authenticated, service_role;
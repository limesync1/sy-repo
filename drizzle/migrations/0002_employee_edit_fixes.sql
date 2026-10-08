CREATE OR REPLACE FUNCTION public.employee_update_stop_services(_stop_id uuid, _items jsonb, _apply_future boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c record; it jsonb; old record; v_priced boolean := false; pr record; v_root uuid; v_future int := 0; v_summary text := ''; o record;
  v_found boolean; v_interval_changed boolean := false;
BEGIN
  SELECT * INTO c FROM public._employee_stop_context(_stop_id);
  IF c.order_id IS NULL THEN RAISE EXCEPTION 'Aftalen har ingen bestilling at redigere'; END IF;
  IF c.stop_status = 'completed' THEN RAISE EXCEPTION 'Fortryd udførsel før ydelserne ændres'; END IF;
  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 OR jsonb_array_length(_items) > 30 THEN
    RAISE EXCEPTION 'Aftalen skal have mindst én ydelse';
  END IF;

  CREATE TEMP TABLE _new_items(service_id uuid, service_name text, quantity numeric, unit_price numeric, details jsonb) ON COMMIT DROP;
  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_found := false;
    IF (it->>'item_id') IS NOT NULL THEN
      SELECT * INTO old FROM order_items WHERE id = (it->>'item_id')::uuid AND order_id = c.order_id;
      v_found := FOUND;
    END IF;
    v_priced := false;
    IF v_found THEN v_priced := (old.service_id IS NOT NULL AND it ? 'pricing'); END IF;
    IF v_priced THEN
      SELECT * INTO pr FROM public._employee_price_item(c.business_id, old.service_id,
        it || jsonb_build_object('current_interval', old.details->>'interval'));
      IF coalesce(old.details->>'interval','') <> coalesce(pr.details->>'interval','') THEN v_interval_changed := true; END IF;
      INSERT INTO _new_items VALUES (old.service_id, pr.service_name, pr.quantity, pr.unit_price, coalesce(old.details,'{}'::jsonb) || pr.details);
    ELSIF v_found THEN
      INSERT INTO _new_items VALUES (old.service_id, old.service_name,
        LEAST(GREATEST(coalesce((it->>'quantity')::numeric, 1), 0.25), 10000), old.unit_price, coalesce(old.details, '{}'::jsonb));
    ELSE
      IF (it->>'service_id') IS NULL THEN RAISE EXCEPTION 'Ydelsen findes ikke længere. Luk vinduet og prøv igen'; END IF;
      SELECT * INTO pr FROM public._employee_price_item(c.business_id, (it->>'service_id')::uuid, it);
      INSERT INTO _new_items VALUES ((it->>'service_id')::uuid, pr.service_name, pr.quantity, pr.unit_price, pr.details);
    END IF;
  END LOOP;

  SELECT string_agg(service_name || ' × ' || trim(to_char(quantity, 'FM999990.##')), ', ') INTO v_summary FROM _new_items;

  DELETE FROM order_items WHERE order_id = c.order_id;
  INSERT INTO order_items(order_id, service_id, service_name, quantity, unit_price, total_price, details)
    SELECT c.order_id, service_id, service_name, quantity, unit_price, round(unit_price * quantity, 2), details FROM _new_items;
  UPDATE orders SET total_amount = (SELECT coalesce(sum(total_price),0) FROM order_items WHERE order_id = c.order_id),
         adjusted_amount = CASE WHEN adjusted_amount IS NULL THEN NULL
                                ELSE (SELECT coalesce(sum(total_price),0) FROM order_items WHERE order_id = c.order_id) END,
         updated_at = now()
   WHERE id = c.order_id;
  UPDATE route_stops SET service_summary = v_summary, updated_at = now() WHERE id = c.stop_id;

  IF _apply_future THEN
    IF c.agreement_id IS NOT NULL THEN
      DELETE FROM agreement_items WHERE agreement_id = c.agreement_id;
      INSERT INTO agreement_items(agreement_id, service_id, service_name, quantity, unit_price, total_price, details)
        SELECT c.agreement_id, service_id, service_name, quantity, unit_price, round(unit_price * quantity, 2), details FROM _new_items;
    END IF;
    SELECT coalesce(parent_order_id, id) INTO v_root FROM orders WHERE id = c.order_id;
    FOR o IN
      SELECT ord.id FROM orders ord
      WHERE ord.business_id = c.business_id AND ord.id <> c.order_id
        AND (ord.id = v_root OR ord.parent_order_id = v_root)
        AND ord.status IN ('pending','confirmed')
        AND ord.created_at >= (SELECT created_at FROM orders WHERE id = c.order_id)
        AND NOT EXISTS (SELECT 1 FROM route_stops x WHERE x.order_id = ord.id AND x.status = 'completed')
    LOOP
      DELETE FROM order_items WHERE order_id = o.id;
      INSERT INTO order_items(order_id, service_id, service_name, quantity, unit_price, total_price, details)
        SELECT o.id, service_id, service_name, quantity, unit_price, round(unit_price * quantity, 2), details FROM _new_items;
      UPDATE orders SET total_amount = (SELECT coalesce(sum(total_price),0) FROM order_items WHERE order_id = o.id), updated_at = now() WHERE id = o.id;
      UPDATE route_stops SET service_summary = v_summary, updated_at = now() WHERE order_id = o.id AND status <> 'completed';
      v_future := v_future + 1;
    END LOOP;
    UPDATE subscriptions sub SET
      total_price = round(n.unit_price * n.quantity, 2),
      details = coalesce(sub.details, '{}'::jsonb) || jsonb_build_object('quantity', n.quantity),
      updated_at = now()
    FROM _new_items n
    WHERE sub.order_id = v_root AND sub.service_id = n.service_id AND sub.status <> 'cancelled';
  END IF;

  INSERT INTO employee_appointment_notes(business_id, stop_id, order_id, agreement_id, route_id, employee_id, author_user_id, kind, body)
  VALUES (c.business_id, c.stop_id, c.order_id, c.agreement_id, c.route_id, c.employee_id, auth.uid(), 'services_changed',
          'Ydelser ændret til: ' || v_summary || CASE WHEN _apply_future THEN ' (også kommende besøg)' ELSE ' (kun dette besøg)' END
          || CASE WHEN v_interval_changed THEN '. Intervallet er ændret — kontrollér rutens placering i ruteplanlæggeren.' ELSE '' END);
  INSERT INTO route_events(business_id, entity_type, entity_id, route_id, event_type, payload, created_by)
  VALUES (c.business_id, 'route_stop', c.stop_id, c.route_id, 'employee_services_edited',
          jsonb_build_object('items', _items, 'apply_future', _apply_future, 'future_orders', v_future), auth.uid());

  RETURN jsonb_build_object('summary', v_summary, 'future_orders', v_future,
    'agreement_updated', _apply_future AND c.agreement_id IS NOT NULL, 'interval_changed', v_interval_changed);
END $function$;

CREATE OR REPLACE FUNCTION public.employee_create_order_from_stop(_stop_id uuid, _item jsonb, _start_date date, _add_to_route boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE c record; src record; pr record; r record; v_id uuid := gen_random_uuid(); v_seq int; v_added boolean := false; v_reason text;
BEGIN
  SELECT * INTO c FROM public._employee_stop_context(_stop_id);
  IF c.order_id IS NULL THEN RAISE EXCEPTION 'Stoppet har ingen kunde at oprette en aftale for'; END IF;
  IF (_item->>'service_id') IS NULL THEN RAISE EXCEPTION 'Vælg en ydelse'; END IF;
  IF _start_date IS NULL OR _start_date < current_date - 1 OR _start_date > current_date + 730 THEN
    RAISE EXCEPTION 'Vælg en gyldig opstartsdato';
  END IF;
  SELECT * INTO src FROM orders WHERE id = c.order_id;
  SELECT * INTO r FROM routes WHERE id = c.route_id;
  SELECT * INTO pr FROM public._employee_price_item(c.business_id, (_item->>'service_id')::uuid, _item);

  IF _add_to_route THEN
    IF r.route_date <> _start_date THEN v_reason := 'date_mismatch'; _add_to_route := false;
    ELSIF coalesce(pr.details->>'interval','engangskøb') <> 'engangskøb' THEN v_reason := 'recurring'; _add_to_route := false;
    ELSIF r.status IN ('completed','cancelled') THEN v_reason := 'route_closed'; _add_to_route := false;
    END IF;
  END IF;

  INSERT INTO orders(id, parent_order_id, business_id, customer_id, customer_name, customer_email, customer_phone, address, zip_code, city,
    latitude, longitude, cvr, company_name, preferred_date, total_amount, status, requires_customer_approval, notes)
  VALUES (v_id, v_id, c.business_id, src.customer_id, src.customer_name, src.customer_email, src.customer_phone, src.address, src.zip_code, src.city,
    src.latitude, src.longitude, src.cvr, src.company_name, _start_date, round(pr.unit_price * pr.quantity, 2), 'confirmed', false,
    'Oprettet af medarbejder under rutekørsel');
  INSERT INTO order_items(order_id, service_id, service_name, quantity, unit_price, total_price, details)
  VALUES (v_id, (_item->>'service_id')::uuid, pr.service_name, pr.quantity, pr.unit_price, round(pr.unit_price * pr.quantity, 2), pr.details);

  IF _add_to_route THEN
    SELECT coalesce(max(sequence), 0) + 1 INTO v_seq FROM route_stops WHERE route_id = c.route_id;
    INSERT INTO route_stops(route_id, order_id, sequence, status, address, latitude, longitude, customer_name, customer_phone, service_summary, assigned_employee_id)
    SELECT c.route_id, v_id, v_seq, 'pending', rs.address, rs.latitude, rs.longitude, rs.customer_name, rs.customer_phone,
      pr.service_name || ' × ' || trim(to_char(pr.quantity, 'FM999990.##')), c.employee_id
    FROM route_stops rs WHERE rs.id = c.stop_id;
    v_added := true;
  END IF;

  INSERT INTO employee_appointment_notes(business_id, stop_id, order_id, agreement_id, route_id, employee_id, author_user_id, kind, body)
  VALUES (c.business_id, c.stop_id, v_id, c.agreement_id, c.route_id, c.employee_id, auth.uid(), 'services_changed',
    'Ny aftale oprettet: ' || pr.service_name || ' (' || coalesce(pr.details->>'interval','engangskøb') || ', start ' || to_char(_start_date,'DD-MM-YYYY') || ')'
    || CASE WHEN v_added THEN ' — tilføjet til dagens rute.' ELSE ' — ligger i Aftaler uden rute.' END);

  RETURN jsonb_build_object('order_id', v_id, 'added_to_route', v_added, 'total', round(pr.unit_price * pr.quantity, 2), 'reason', v_reason);
END $function$;
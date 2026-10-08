
-- Delt prisberegning for medarbejderens redigering: prisen regnes altid på serveren ud fra servicens prismodel.
CREATE OR REPLACE FUNCTION public._employee_price_item(_business_id uuid, _service_id uuid, _item jsonb,
  OUT service_name text, OUT unit_price numeric, OUT quantity numeric, OUT details jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s record; st record; p jsonb := coalesce(_item->'pricing', '{}'::jsonb); v numeric; total numeric := 0;
  steps jsonb := '[]'::jsonb; iv text; opts text[]; desc_t text := '';
BEGIN
  SELECT * INTO s FROM services WHERE id = _service_id AND business_id = _business_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ydelsen findes ikke længere. Luk vinduet og prøv igen'; END IF;
  service_name := s.name;
  quantity := LEAST(GREATEST(coalesce((_item->>'quantity')::numeric, 1), 0.25), 10000);
  IF s.pricing_type = 'timepris' THEN
    v := LEAST(GREATEST(coalesce((p->>'hours')::numeric, quantity), 0.25), 24);
    unit_price := coalesce((p->>'unit_price')::numeric, s.base_price, 0);
    quantity := v; desc_t := trim(to_char(v, 'FM990.##')) || ' timer';
  ELSIF s.pricing_type = 'prisberegner' THEN
    FOR st IN SELECT * FROM calculator_steps WHERE service_id = s.id ORDER BY sort_order LOOP
      v := coalesce((p->'steps'->>st.id::text)::numeric, st.default_value, st.min_value, 0);
      v := LEAST(GREATEST(v, coalesce(st.min_value, 0)), coalesce(st.max_value, 100000));
      total := total + v * coalesce(st.price_per_unit, 0);
      steps := steps || jsonb_build_object('id', st.id, 'label', st.label, 'value', v, 'unit', coalesce(st.unit, s.unit, 'stk'),
        'price_per_unit', st.price_per_unit, 'subtotal', round(v * coalesce(st.price_per_unit,0), 2),
        'min_value', st.min_value, 'max_value', st.max_value, 'default_value', st.default_value, 'sort_order', st.sort_order);
    END LOOP;
    unit_price := round(total, 2);
  ELSE
    unit_price := coalesce((p->>'unit_price')::numeric, s.base_price, 0);
    desc_t := 'Specifik pris';
  END IF;
  IF unit_price < 0 OR unit_price > 1000000 THEN RAISE EXCEPTION 'Prisen for % er ugyldig', s.name; END IF;
  opts := CASE WHEN coalesce(array_length(s.interval_options,1),0) > 0 THEN s.interval_options ELSE ARRAY['engangskøb'] END;
  iv := coalesce(nullif(p->>'interval',''), opts[1]);
  IF NOT (iv = ANY(opts)) AND iv <> coalesce(_item->>'current_interval','') THEN
    RAISE EXCEPTION 'Intervallet passer ikke til ydelsen %', s.name;
  END IF;
  details := jsonb_build_object('description', desc_t, 'interval', iv,
    'pricingSnapshot', jsonb_build_object('pricing_type', s.pricing_type, 'base_price', coalesce(s.base_price,0), 'unit', s.unit, 'interval_options', to_jsonb(opts)))
    || CASE WHEN s.pricing_type = 'prisberegner' THEN jsonb_build_object('stepDetails', steps) ELSE '{}'::jsonb END;
END $$;
REVOKE ALL ON FUNCTION public._employee_price_item(uuid, uuid, jsonb) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.employee_update_stop_services(_stop_id uuid, _items jsonb, _apply_future boolean DEFAULT true)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  c record; it jsonb; old record; pr record; v_root uuid; v_future int := 0; v_summary text := ''; o record;
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
    IF v_found AND old.service_id IS NOT NULL AND it ? 'pricing' THEN
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

-- Medarbejderen opretter en ny aftale hos kunden på stoppet. Lander i "Aftaler uden rute",
-- eller som ekstra stop på samme rute når det er en engangsopgave på rutens dato.
CREATE OR REPLACE FUNCTION public.employee_create_order_from_stop(_stop_id uuid, _item jsonb, _start_date date, _add_to_route boolean DEFAULT false)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE c record; src record; pr record; r record; v_id uuid := gen_random_uuid(); v_seq int; v_added boolean := false;
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
    IF r.route_date <> _start_date THEN RAISE EXCEPTION 'Opstartsdatoen passer ikke med rutens dato'; END IF;
    IF coalesce(pr.details->>'interval','engangskøb') <> 'engangskøb' THEN
      RAISE EXCEPTION 'Faste aftaler skal placeres af kontoret, så de lander på den rigtige rute';
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

  RETURN jsonb_build_object('order_id', v_id, 'added_to_route', v_added, 'total', round(pr.unit_price * pr.quantity, 2));
END $function$;
REVOKE ALL ON FUNCTION public.employee_create_order_from_stop(uuid, jsonb, date, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.employee_create_order_from_stop(uuid, jsonb, date, boolean) TO authenticated;

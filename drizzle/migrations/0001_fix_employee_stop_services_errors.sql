CREATE OR REPLACE FUNCTION public.employee_update_stop_services(_stop_id uuid, _items jsonb, _apply_future boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c record; it jsonb; old record; s record; v_root uuid; v_future int := 0; v_summary text := ''; o record;
  v_qty numeric; v_details jsonb; v_found boolean;
BEGIN
  SELECT * INTO c FROM public._employee_stop_context(_stop_id);
  IF c.order_id IS NULL THEN RAISE EXCEPTION 'Aftalen har ingen bestilling at redigere'; END IF;
  IF c.stop_status = 'completed' THEN RAISE EXCEPTION 'Fortryd udførsel før ydelserne ændres'; END IF;
  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 OR jsonb_array_length(_items) > 30 THEN
    RAISE EXCEPTION 'Aftalen skal have mindst én ydelse';
  END IF;

  CREATE TEMP TABLE _new_items(service_id uuid, service_name text, quantity numeric, unit_price numeric, details jsonb) ON COMMIT DROP;
  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := LEAST(GREATEST(coalesce((it->>'quantity')::numeric, 1), 0.25), 10000);
    v_found := false;
    IF (it->>'item_id') IS NOT NULL THEN
      SELECT * INTO old FROM order_items WHERE id = (it->>'item_id')::uuid AND order_id = c.order_id;
      v_found := FOUND;
    END IF;
    IF v_found THEN
      INSERT INTO _new_items VALUES (old.service_id, old.service_name, v_qty, old.unit_price, coalesce(old.details, '{}'::jsonb));
    ELSE
      IF (it->>'service_id') IS NULL THEN RAISE EXCEPTION 'Ydelsen findes ikke længere. Luk vinduet og prøv igen'; END IF;
      SELECT id, name, base_price INTO s FROM services
       WHERE id = (it->>'service_id')::uuid AND business_id = c.business_id AND is_active;
      IF NOT FOUND THEN RAISE EXCEPTION 'Ydelsen findes ikke længere. Luk vinduet og prøv igen'; END IF;
      INSERT INTO _new_items VALUES (s.id, s.name, v_qty, coalesce(s.base_price, 0), '{}'::jsonb);
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
          'Ydelser ændret til: ' || v_summary || CASE WHEN _apply_future THEN ' (også kommende besøg)' ELSE ' (kun dette besøg)' END);
  INSERT INTO route_events(business_id, entity_type, entity_id, route_id, event_type, payload, created_by)
  VALUES (c.business_id, 'route_stop', c.stop_id, c.route_id, 'employee_services_edited',
          jsonb_build_object('items', _items, 'apply_future', _apply_future, 'future_orders', v_future), auth.uid());

  RETURN jsonb_build_object('summary', v_summary, 'future_orders', v_future, 'agreement_updated', _apply_future AND c.agreement_id IS NOT NULL);
END $$;
REVOKE EXECUTE ON FUNCTION public.employee_update_stop_services(uuid, jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.employee_update_stop_services(uuid, jsonb, boolean) TO authenticated;
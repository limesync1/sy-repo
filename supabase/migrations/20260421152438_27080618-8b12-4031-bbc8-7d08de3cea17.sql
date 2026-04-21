-- Slet alle data for Ready2Clean (business_id: 8258070b-acc7-4145-b236-e2157001563c)
DO $$
DECLARE
  v_business_id uuid := '8258070b-acc7-4145-b236-e2157001563c';
BEGIN
  -- Route stop assignees (via route_stops -> routes)
  DELETE FROM public.route_stop_assignees
  WHERE stop_id IN (
    SELECT rs.id FROM public.route_stops rs
    JOIN public.routes r ON r.id = rs.route_id
    WHERE r.business_id = v_business_id
  );

  -- Route stops
  DELETE FROM public.route_stops
  WHERE route_id IN (SELECT id FROM public.routes WHERE business_id = v_business_id);

  -- Route employees
  DELETE FROM public.route_employees
  WHERE route_id IN (SELECT id FROM public.routes WHERE business_id = v_business_id);

  -- Routes
  DELETE FROM public.routes WHERE business_id = v_business_id;

  -- Reviews (knyttet til business)
  DELETE FROM public.reviews WHERE business_id = v_business_id;

  -- Subscriptions (aftaler)
  DELETE FROM public.subscriptions WHERE business_id = v_business_id;

  -- Order items (kunders bestillinger via orders)
  DELETE FROM public.order_items
  WHERE order_id IN (SELECT id FROM public.orders WHERE business_id = v_business_id);

  -- Orders (kunder/bestillinger)
  DELETE FROM public.orders WHERE business_id = v_business_id;

  -- Quotes fra denne virksomhed
  DELETE FROM public.quotes WHERE business_id = v_business_id;

  -- Calculator steps for services
  DELETE FROM public.calculator_steps
  WHERE service_id IN (SELECT id FROM public.services WHERE business_id = v_business_id);

  -- Services
  DELETE FROM public.services WHERE business_id = v_business_id;

  -- Employee invitations
  DELETE FROM public.employee_invitations WHERE business_id = v_business_id;

  -- Favorites pegende på denne business
  DELETE FROM public.favorites WHERE business_id = v_business_id;

  -- Employees
  DELETE FROM public.employees WHERE business_id = v_business_id;
END $$;
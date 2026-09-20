DO $$
DECLARE v_route uuid;
BEGIN
  INSERT INTO public.routes (business_id, employee_id, route_date, status, name, color,
    start_address, start_latitude, start_longitude, planned_start_time, start_from_home)
  VALUES ('8258070b-acc7-4145-b236-e2157001563c', 'd3bc07c5-5ec1-4842-bac5-3e5cf1ef8c74',
    '2026-09-20', 'planned', 'Testkørsel Herning', 'hsl(206 99% 30%)',
    'Vistorpvej 30, 7540 Haderup', 56.31268716, 9.03866815, '09:00', false)
  RETURNING id INTO v_route;

  INSERT INTO public.route_stops (route_id, sequence, status, address, latitude, longitude,
    customer_name, service_summary, duration_minutes, planned_arrival, planned_departure,
    assigned_employee_id, required_staff)
  VALUES
    (v_route, 1, 'pending', 'Viborgvej 88, 7400 Herning', 56.1448769, 8.9907360,
     'Rema 1000 Viborgvej', 'Testopgave', 15, '2026-09-20 09:30:00+02', '2026-09-20 09:45:00+02',
     'd3bc07c5-5ec1-4842-bac5-3e5cf1ef8c74', 1),
    (v_route, 2, 'pending', 'Åvænget 6, 7400 Herning', 56.13275939, 9.00727004,
     'McDonald''s Åvænget', 'Testopgave', 15, '2026-09-20 10:00:00+02', '2026-09-20 10:15:00+02',
     'd3bc07c5-5ec1-4842-bac5-3e5cf1ef8c74', 1),
    (v_route, 3, 'pending', 'Åvænget 12, 7400 Herning', 56.1327593, 9.0097455,
     'Bauhaus Herning', 'Testopgave', 15, '2026-09-20 10:20:00+02', '2026-09-20 10:35:00+02',
     'd3bc07c5-5ec1-4842-bac5-3e5cf1ef8c74', 1),
    (v_route, 4, 'pending', 'Åvænget 16, 7400 Herning', 56.1316746, 9.0102174,
     'Biltema Herning', 'Testopgave', 15, '2026-09-20 10:40:00+02', '2026-09-20 10:55:00+02',
     'd3bc07c5-5ec1-4842-bac5-3e5cf1ef8c74', 1);
END $$;
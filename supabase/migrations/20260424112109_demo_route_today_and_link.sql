-- Flyt demo-ruten til i dag og link William i route_employees, så både legacy
-- og junction-table-veje finder ruten.
UPDATE public.routes
   SET route_date = CURRENT_DATE,
       updated_at = now()
 WHERE id = 'af815779-29f2-46c6-9282-9dd5baa5f91c';

INSERT INTO public.route_employees (route_id, employee_id)
VALUES ('af815779-29f2-46c6-9282-9dd5baa5f91c', 'd3bc07c5-5ec1-4842-bac5-3e5cf1ef8c74')
ON CONFLICT DO NOTHING;

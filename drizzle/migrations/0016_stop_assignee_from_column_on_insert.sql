CREATE OR REPLACE FUNCTION public.ensure_lead_assignee_on_stop_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.assigned_employee_id IS NOT NULL THEN
    INSERT INTO public.route_stop_assignees (stop_id, employee_id, is_lead)
    VALUES (NEW.id, NEW.assigned_employee_id, true)
    ON CONFLICT (stop_id, employee_id) DO NOTHING;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_ensure_lead_assignee_on_stop_insert ON public.route_stops;
CREATE TRIGGER trg_ensure_lead_assignee_on_stop_insert
AFTER INSERT ON public.route_stops
FOR EACH ROW EXECUTE FUNCTION public.ensure_lead_assignee_on_stop_insert();

INSERT INTO public.route_stop_assignees (stop_id, employee_id, is_lead)
SELECT rs.id, rs.assigned_employee_id, true
FROM public.route_stops rs
WHERE rs.assigned_employee_id IS NOT NULL
  AND rs.status <> 'completed'
  AND NOT EXISTS (SELECT 1 FROM public.route_stop_assignees a WHERE a.stop_id = rs.id)
ON CONFLICT (stop_id, employee_id) DO NOTHING;
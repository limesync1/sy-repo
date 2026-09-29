CREATE OR REPLACE FUNCTION public.is_route_assigned_employee(_route_id uuid, _user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.routes r
    JOIN public.employees e ON e.business_id = r.business_id AND e.user_id = _user_id
    WHERE r.id = _route_id AND (
      r.employee_id = e.id
      OR EXISTS (SELECT 1 FROM public.route_employees re WHERE re.route_id = r.id AND re.employee_id = e.id)
      OR EXISTS (SELECT 1 FROM public.route_stops rs WHERE rs.route_id = r.id AND rs.assigned_employee_id = e.id)
      OR EXISTS (SELECT 1 FROM public.route_stops rs JOIN public.route_stop_assignees rsa ON rsa.stop_id = rs.id
                 WHERE rs.route_id = r.id AND rsa.employee_id = e.id)
    )
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_route_assigned_employee(uuid, uuid) TO authenticated, service_role;

ALTER FUNCTION public.report_route_position(uuid, double precision, double precision, double precision, double precision, double precision, uuid) SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION public.report_route_position(uuid, double precision, double precision, double precision, double precision, double precision, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_route_position(uuid, double precision, double precision, double precision, double precision, double precision, uuid) TO authenticated;
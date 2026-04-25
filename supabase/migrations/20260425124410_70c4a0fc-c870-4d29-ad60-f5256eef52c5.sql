CREATE OR REPLACE FUNCTION public.is_route_assigned_employee(_route_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.route_employees re
    JOIN public.employees e ON e.id = re.employee_id
    WHERE re.route_id = _route_id
      AND e.user_id = _user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.routes r
    JOIN public.employees e ON e.id = r.employee_id
    WHERE r.id = _route_id
      AND e.user_id = _user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.route_stops rs
    JOIN public.route_stop_assignees rsa ON rsa.stop_id = rs.id
    JOIN public.employees e ON e.id = rsa.employee_id
    WHERE rs.route_id = _route_id
      AND e.user_id = _user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.route_stops rs
    JOIN public.employees e ON e.id = rs.assigned_employee_id
    WHERE rs.route_id = _route_id
      AND e.user_id = _user_id
  )
$$;
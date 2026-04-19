
-- Helper functions to break recursion between routes and route_employees policies
CREATE OR REPLACE FUNCTION public.is_route_owner(_route_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.routes r
    JOIN public.businesses b ON b.id = r.business_id
    WHERE r.id = _route_id AND b.owner_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_route_assigned_employee(_route_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.route_employees re
    JOIN public.employees e ON e.id = re.employee_id
    WHERE re.route_id = _route_id AND e.user_id = _user_id
  )
$$;

-- Drop and recreate route_employees policies using helper (no self-reference)
DROP POLICY IF EXISTS "Business owners manage their route employees" ON public.route_employees;
DROP POLICY IF EXISTS "Admins manage all route employees" ON public.route_employees;
DROP POLICY IF EXISTS "Employees view their own assignments" ON public.route_employees;

CREATE POLICY "Business owners manage their route employees"
ON public.route_employees FOR ALL
USING (public.is_route_owner(route_id, auth.uid()))
WITH CHECK (public.is_route_owner(route_id, auth.uid()));

CREATE POLICY "Admins manage all route employees"
ON public.route_employees FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees view their own assignments"
ON public.route_employees FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.employees e
  WHERE e.id = route_employees.employee_id AND e.user_id = auth.uid()
));

-- Replace the recursive employee SELECT policy on routes with helper-based one
DROP POLICY IF EXISTS "Employees view assigned routes" ON public.routes;
CREATE POLICY "Employees view assigned routes"
ON public.routes FOR SELECT
USING (public.is_route_assigned_employee(id, auth.uid()));

-- Replace recursive route_stops policies
DROP POLICY IF EXISTS "Employees view their route stops" ON public.route_stops;
CREATE POLICY "Employees view their route stops"
ON public.route_stops FOR SELECT
USING (public.is_route_assigned_employee(route_id, auth.uid()));

DROP POLICY IF EXISTS "Employees update their route stops" ON public.route_stops;
CREATE POLICY "Employees update their route stops"
ON public.route_stops FOR UPDATE
USING (public.is_route_assigned_employee(route_id, auth.uid()));

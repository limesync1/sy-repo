
-- 1) Rename routes for clarity (give a route a name)
ALTER TABLE public.routes
  ADD COLUMN IF NOT EXISTS name text;

-- 2) Junction table: many employees per route
CREATE TABLE IF NOT EXISTS public.route_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_route_employees_route ON public.route_employees(route_id);
CREATE INDEX IF NOT EXISTS idx_route_employees_employee ON public.route_employees(employee_id);

ALTER TABLE public.route_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners manage their route employees"
ON public.route_employees FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.routes r
  JOIN public.businesses b ON b.id = r.business_id
  WHERE r.id = route_employees.route_id AND b.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.routes r
  JOIN public.businesses b ON b.id = r.business_id
  WHERE r.id = route_employees.route_id AND b.owner_id = auth.uid()
));

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

-- 3) Per-stop employee assignment
ALTER TABLE public.route_stops
  ADD COLUMN IF NOT EXISTS assigned_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_route_stops_assigned_employee
  ON public.route_stops(assigned_employee_id);

-- 4) Migrate: existing routes.employee_id → route_employees + assigned_employee_id on stops
INSERT INTO public.route_employees (route_id, employee_id)
SELECT id, employee_id FROM public.routes
WHERE employee_id IS NOT NULL
ON CONFLICT (route_id, employee_id) DO NOTHING;

UPDATE public.route_stops rs
SET assigned_employee_id = r.employee_id
FROM public.routes r
WHERE rs.route_id = r.id
  AND rs.assigned_employee_id IS NULL
  AND r.employee_id IS NOT NULL;

-- 5) Update employee SELECT policies on routes/route_stops to use junction
DROP POLICY IF EXISTS "Employees view their own routes" ON public.routes;
CREATE POLICY "Employees view assigned routes"
ON public.routes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.route_employees re
  JOIN public.employees e ON e.id = re.employee_id
  WHERE re.route_id = routes.id AND e.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Employees view their route stops" ON public.route_stops;
CREATE POLICY "Employees view their route stops"
ON public.route_stops FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.route_employees re
  JOIN public.employees e ON e.id = re.employee_id
  WHERE re.route_id = route_stops.route_id AND e.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Employees update their route stops" ON public.route_stops;
CREATE POLICY "Employees update their route stops"
ON public.route_stops FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.route_employees re
  JOIN public.employees e ON e.id = re.employee_id
  WHERE re.route_id = route_stops.route_id AND e.user_id = auth.uid()
));

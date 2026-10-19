DROP POLICY IF EXISTS "Employees manage own workdays" ON public.employee_workdays;
CREATE POLICY "Employees manage own workdays" ON public.employee_workdays
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_workdays.employee_id AND e.user_id = auth.uid() AND e.is_active = true))
WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_workdays.employee_id AND e.user_id = auth.uid() AND e.is_active = true));
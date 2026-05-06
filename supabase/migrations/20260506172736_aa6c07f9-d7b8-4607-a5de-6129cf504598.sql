
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS employee_number text,
  ADD COLUMN IF NOT EXISTS employee_group text;

CREATE INDEX IF NOT EXISTS idx_employees_employee_number
  ON public.employees(business_id, employee_number)
  WHERE employee_number IS NOT NULL;

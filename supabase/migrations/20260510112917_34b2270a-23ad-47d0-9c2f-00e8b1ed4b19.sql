ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS default_employee_id uuid
  REFERENCES public.employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_services_default_employee
  ON public.services(default_employee_id)
  WHERE default_employee_id IS NOT NULL;
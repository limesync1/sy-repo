CREATE TABLE public.employee_absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  absence_type text NOT NULL DEFAULT 'sick',
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employee_absences_range_valid CHECK (end_date >= start_date),
  CONSTRAINT employee_absences_type_valid CHECK (absence_type IN ('sick','vacation','other'))
);

CREATE INDEX idx_employee_absences_business_range ON public.employee_absences (business_id, start_date, end_date);
CREATE INDEX idx_employee_absences_employee_range ON public.employee_absences (employee_id, start_date, end_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_absences TO authenticated;
GRANT ALL ON public.employee_absences TO service_role;

ALTER TABLE public.employee_absences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all employee absences"
ON public.employee_absences FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Business owners manage their employee absences"
ON public.employee_absences FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = employee_absences.business_id AND b.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = employee_absences.business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Employees view their own absences"
ON public.employee_absences FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_absences.employee_id AND e.user_id = auth.uid()));

CREATE TRIGGER update_employee_absences_updated_at
BEFORE UPDATE ON public.employee_absences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
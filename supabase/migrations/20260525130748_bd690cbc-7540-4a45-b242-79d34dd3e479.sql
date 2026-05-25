CREATE TABLE IF NOT EXISTS public.agreement_occurrence_overrides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agreement_id uuid NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  original_date date NOT NULL,
  new_date date,
  new_employee_ids uuid[],
  status text NOT NULL DEFAULT 'modified',
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT agreement_occurrence_overrides_status_check CHECK (status IN ('modified','cancelled','rescheduled')),
  CONSTRAINT agreement_occurrence_overrides_unique UNIQUE (agreement_id, original_date)
);

CREATE INDEX IF NOT EXISTS idx_agreement_occ_overrides_agreement
  ON public.agreement_occurrence_overrides(agreement_id, original_date);

CREATE INDEX IF NOT EXISTS idx_agreement_occ_overrides_business
  ON public.agreement_occurrence_overrides(business_id);

ALTER TABLE public.agreement_occurrence_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all agreement overrides"
  ON public.agreement_occurrence_overrides
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners manage their agreement overrides"
  ON public.agreement_occurrence_overrides
  FOR ALL
  USING (is_business_owner(business_id, auth.uid()))
  WITH CHECK (is_business_owner(business_id, auth.uid()));

CREATE POLICY "Customers read own agreement overrides"
  ON public.agreement_occurrence_overrides
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.agreements a
    WHERE a.id = agreement_occurrence_overrides.agreement_id
      AND auth.uid() IS NOT NULL
      AND (a.customer_id = auth.uid()
        OR lower(a.customer_email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
  ));

CREATE TRIGGER update_agreement_occurrence_overrides_updated_at
  BEFORE UPDATE ON public.agreement_occurrence_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
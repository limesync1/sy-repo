
CREATE TABLE public.agreement_pauses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  agreement_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agreement_pauses_agreement ON public.agreement_pauses(agreement_id);
CREATE INDEX idx_agreement_pauses_business ON public.agreement_pauses(business_id);
CREATE INDEX idx_agreement_pauses_range ON public.agreement_pauses(agreement_id, start_date, end_date);

ALTER TABLE public.agreement_pauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all pauses"
ON public.agreement_pauses FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Business owners manage their pauses"
ON public.agreement_pauses FOR ALL
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = agreement_pauses.business_id AND b.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = agreement_pauses.business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Employees view pauses for their routes"
ON public.agreement_pauses FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.employees e
  WHERE e.user_id = auth.uid() AND e.business_id = agreement_pauses.business_id
));

CREATE TRIGGER agreement_pauses_updated_at
BEFORE UPDATE ON public.agreement_pauses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_agreement_pause_range()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.end_date < NEW.start_date THEN
    RAISE EXCEPTION 'pause end_date (%) cannot be before start_date (%)', NEW.end_date, NEW.start_date;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER agreement_pauses_validate_range
BEFORE INSERT OR UPDATE ON public.agreement_pauses
FOR EACH ROW EXECUTE FUNCTION public.validate_agreement_pause_range();

CREATE TABLE public.business_holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  holiday_date DATE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, holiday_date)
);

CREATE INDEX idx_business_holidays_business_date ON public.business_holidays(business_id, holiday_date);

ALTER TABLE public.business_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all holidays"
ON public.business_holidays FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Business owners manage holidays"
ON public.business_holidays FOR ALL
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_holidays.business_id AND b.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_holidays.business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Employees read holidays"
ON public.business_holidays FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.employees e
  WHERE e.user_id = auth.uid() AND e.business_id = business_holidays.business_id
));

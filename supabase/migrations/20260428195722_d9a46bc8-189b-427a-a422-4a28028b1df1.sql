-- Persisteret onboarding-fremgang pr. virksomhed
CREATE TABLE public.business_onboarding_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL UNIQUE,
  completed_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  skipped_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_step text,
  wizard_dismissed boolean NOT NULL DEFAULT false,
  fully_completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.business_onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their onboarding progress"
ON public.business_onboarding_progress
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_onboarding_progress.business_id AND b.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_onboarding_progress.business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Admins manage all onboarding progress"
ON public.business_onboarding_progress
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_business_onboarding_progress_updated_at
BEFORE UPDATE ON public.business_onboarding_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
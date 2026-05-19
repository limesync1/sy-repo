
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS startup_fee_dkk numeric NOT NULL DEFAULT 2269;
ALTER TABLE public.platform_settings ALTER COLUMN base_price_dkk SET DEFAULT 289;
ALTER TABLE public.platform_settings ALTER COLUMN price_route_planning_dkk SET DEFAULT 0;
ALTER TABLE public.platform_settings ALTER COLUMN price_accounting_integration_dkk SET DEFAULT 269;
ALTER TABLE public.platform_settings ALTER COLUMN price_per_employee_login_dkk SET DEFAULT 59;

UPDATE public.platform_settings
SET base_price_dkk = 289,
    price_route_planning_dkk = 0,
    price_accounting_integration_dkk = 269,
    price_per_employee_login_dkk = 59,
    startup_fee_dkk = 2269,
    updated_at = now()
WHERE id = 1;

ALTER TABLE public.business_plans
  ADD COLUMN IF NOT EXISTS locked_extra_employee_logins integer,
  ADD COLUMN IF NOT EXISTS locked_accounting_integration boolean,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS startup_fee_charged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz;

UPDATE public.business_plans SET route_planning_enabled = true WHERE route_planning_enabled IS DISTINCT FROM true;
ALTER TABLE public.business_plans ALTER COLUMN route_planning_enabled SET DEFAULT true;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE TABLE IF NOT EXISTS public.business_deletion_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_deletion_codes_business ON public.business_deletion_codes(business_id);
ALTER TABLE public.business_deletion_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view own deletion codes" ON public.business_deletion_codes;
CREATE POLICY "Owners can view own deletion codes"
  ON public.business_deletion_codes
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_deletion_codes.business_id AND b.owner_id = auth.uid())
  );

DROP FUNCTION IF EXISTS public.get_platform_pricing();
CREATE OR REPLACE FUNCTION public.get_platform_pricing()
RETURNS TABLE (
  base_price_dkk numeric,
  price_route_planning_dkk numeric,
  price_accounting_integration_dkk numeric,
  price_data_import_dkk numeric,
  price_per_employee_login_dkk numeric,
  startup_fee_dkk numeric,
  discount_quarterly_pct numeric,
  discount_yearly_pct numeric,
  trial_days integer,
  stripe_publishable_key text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT base_price_dkk, price_route_planning_dkk, price_accounting_integration_dkk,
    price_data_import_dkk, price_per_employee_login_dkk, startup_fee_dkk,
    discount_quarterly_pct, discount_yearly_pct, trial_days, stripe_publishable_key
  FROM public.platform_settings WHERE id = 1
$$;
GRANT EXECUTE ON FUNCTION public.get_platform_pricing() TO anon, authenticated;

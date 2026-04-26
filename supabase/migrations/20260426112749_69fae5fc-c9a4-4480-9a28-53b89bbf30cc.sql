-- Fjern den problematiske SECURITY DEFINER view og erstat med en sikker funktion
DROP VIEW IF EXISTS public.platform_pricing;

CREATE OR REPLACE FUNCTION public.get_platform_pricing()
RETURNS TABLE (
  base_price_dkk numeric,
  price_route_planning_dkk numeric,
  price_accounting_integration_dkk numeric,
  price_data_import_dkk numeric,
  price_per_employee_login_dkk numeric,
  discount_quarterly_pct numeric,
  discount_yearly_pct numeric,
  trial_days integer,
  stripe_publishable_key text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    base_price_dkk,
    price_route_planning_dkk,
    price_accounting_integration_dkk,
    price_data_import_dkk,
    price_per_employee_login_dkk,
    discount_quarterly_pct,
    discount_yearly_pct,
    trial_days,
    stripe_publishable_key
  FROM public.platform_settings
  WHERE id = 1
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_pricing() TO anon, authenticated;
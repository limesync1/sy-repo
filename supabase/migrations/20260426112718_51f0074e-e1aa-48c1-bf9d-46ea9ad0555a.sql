-- ============================================================================
-- 1) business_plans — virksomhedens valgte pakke + abonnementsstatus
-- ============================================================================
CREATE TABLE public.business_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE,
  -- Funktioner
  route_planning_enabled boolean NOT NULL DEFAULT false,
  accounting_integration_enabled boolean NOT NULL DEFAULT false,
  data_import_requested boolean NOT NULL DEFAULT false,
  extra_employee_logins integer NOT NULL DEFAULT 0,
  -- Fakturering
  billing_period text NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly','quarterly','yearly')),
  monthly_price_dkk numeric NOT NULL DEFAULT 0,
  -- Status
  status text NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing','active','past_due','cancelled','incomplete')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  -- Stripe
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_payment_method_last4 text,
  stripe_payment_method_brand text,
  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_business_plans_business_id ON public.business_plans(business_id);
CREATE INDEX idx_business_plans_status ON public.business_plans(status);

ALTER TABLE public.business_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners view their plan"
  ON public.business_plans FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_plans.business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Business owners update their plan"
  ON public.business_plans FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_plans.business_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_plans.business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Anyone can insert plan during onboarding"
  ON public.business_plans FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_plans.business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Admins manage all plans"
  ON public.business_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER business_plans_updated_at
  BEFORE UPDATE ON public.business_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 2) platform_settings — Stripe nøgler + globale priser (kun admin)
-- ============================================================================
CREATE TABLE public.platform_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  -- Stripe
  stripe_publishable_key text,
  stripe_secret_key text,        -- aldrig direkte til frontend, kun via edge function
  stripe_webhook_secret text,
  -- Pris-tabel (alle priser i DKK per måned)
  base_price_dkk numeric NOT NULL DEFAULT 199,
  price_route_planning_dkk numeric NOT NULL DEFAULT 149,
  price_accounting_integration_dkk numeric NOT NULL DEFAULT 99,
  price_data_import_dkk numeric NOT NULL DEFAULT 0,
  price_per_employee_login_dkk numeric NOT NULL DEFAULT 49,
  -- Rabat
  discount_quarterly_pct numeric NOT NULL DEFAULT 10,
  discount_yearly_pct numeric NOT NULL DEFAULT 20,
  -- Trial
  trial_days integer NOT NULL DEFAULT 14,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.platform_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Publishable nøgle + priser må læses af alle authenticated (til onboarding-prisberegning)
-- Men secret nøgler eksponeres aldrig — vi bruger en SECURITY DEFINER funktion til det
CREATE POLICY "Admins manage platform settings"
  ON public.platform_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public-safe view: kun ikke-følsomme felter
CREATE OR REPLACE VIEW public.platform_pricing AS
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
WHERE id = 1;

GRANT SELECT ON public.platform_pricing TO anon, authenticated;
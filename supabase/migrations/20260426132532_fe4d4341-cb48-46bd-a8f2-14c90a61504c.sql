-- Stripe-felter på business_plans
ALTER TABLE public.business_plans
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS stripe_environment text NOT NULL DEFAULT 'sandbox',
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_payment_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_payment_failed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_business_plans_stripe_subscription_id
  ON public.business_plans (stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_business_plans_stripe_customer_id
  ON public.business_plans (stripe_customer_id);

-- Hjælpefunktion: tjekker om en virksomhed har en aktiv (betalt eller trial-with-card) plan
CREATE OR REPLACE FUNCTION public.business_has_active_plan(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_plans
    WHERE business_id = _business_id
      AND (
        status IN ('active', 'trialing')
        OR (status = 'past_due' AND current_period_end > now())
        OR (trial_ends_at IS NOT NULL AND trial_ends_at > now())
      )
  );
$$;

-- Hjælpefunktion: bruges af webhook til at koble Stripe customer→business
CREATE OR REPLACE FUNCTION public.business_id_for_stripe_customer(_customer_id text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id
  FROM public.business_plans
  WHERE stripe_customer_id = _customer_id
  LIMIT 1;
$$;
CREATE OR REPLACE FUNCTION public._guard_business_plan_owner_changes()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE in_trial boolean; entitled boolean;
BEGIN
  IF public._is_trusted_writer() OR public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    NEW.trial_ends_at := OLD.trial_ends_at;
    NEW.locked_extra_employee_logins := OLD.locked_extra_employee_logins;
    NEW.locked_accounting_integration := OLD.locked_accounting_integration;
    NEW.locked_at := OLD.locked_at;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
    NEW.stripe_subscription_id := OLD.stripe_subscription_id;
    NEW.stripe_price_id := OLD.stripe_price_id;
    NEW.current_period_end := OLD.current_period_end;
    -- Subscription status is only changed by payment confirmation or admins.
    NEW.status := OLD.status;
    in_trial := OLD.status = 'trialing' AND OLD.trial_ends_at IS NOT NULL AND OLD.trial_ends_at > now();
    entitled := in_trial OR OLD.status = 'active';
    IF NOT entitled AND (
         (coalesce(NEW.route_planning_enabled,false) AND NOT coalesce(OLD.route_planning_enabled,false))
      OR (coalesce(NEW.accounting_integration_enabled,false) AND NOT coalesce(OLD.accounting_integration_enabled,false))
    ) THEN
      RAISE EXCEPTION 'Tilkøb kan kun slås til i prøveperioden eller med et aktivt abonnement';
    END IF;
    IF coalesce(NEW.extra_employee_logins,0) > coalesce(OLD.extra_employee_logins,0)
       AND NOT in_trial
       AND coalesce(NEW.extra_employee_logins,0) > coalesce(OLD.locked_extra_employee_logins,0) THEN
      RAISE EXCEPTION 'Ekstra medarbejderlogins skal tilkøbes via betaling';
    END IF;
  ELSE
    NEW.status := 'trialing';
    NEW.locked_extra_employee_logins := 0;
    NEW.stripe_customer_id := NULL;
    NEW.stripe_subscription_id := NULL;
    IF NEW.trial_ends_at IS NULL OR NEW.trial_ends_at > now() + interval '31 days' THEN
      NEW.trial_ends_at := now() + interval '30 days';
    END IF;
    NEW.extra_employee_logins := LEAST(GREATEST(coalesce(NEW.extra_employee_logins,0),0), 50);
  END IF;
  RETURN NEW;
END $function$;

CREATE TABLE public.quote_match_rate_events (
  id bigserial PRIMARY KEY,
  visitor_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.quote_match_rate_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.quote_match_rate_events_id_seq TO service_role;
ALTER TABLE public.quote_match_rate_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX quote_match_rate_events_key_time ON public.quote_match_rate_events (visitor_key, created_at DESC);
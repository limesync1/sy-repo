CREATE OR REPLACE FUNCTION public._guard_business_plan_owner_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE in_trial boolean; entitled boolean;
BEGIN
  IF public._is_trusted_writer() OR public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  -- Kontrolleret skift via set_business_plan_kind (ejertjek sker dér).
  IF current_setting('app.plan_kind_rpc', true) = '1' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    NEW.plan_kind := OLD.plan_kind;
    NEW.trial_ends_at := OLD.trial_ends_at;
    NEW.locked_extra_employee_logins := OLD.locked_extra_employee_logins;
    NEW.locked_accounting_integration := OLD.locked_accounting_integration;
    NEW.locked_at := OLD.locked_at;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
    NEW.stripe_subscription_id := OLD.stripe_subscription_id;
    NEW.stripe_price_id := OLD.stripe_price_id;
    NEW.current_period_end := OLD.current_period_end;
    NEW.status := OLD.status;
    IF OLD.plan_kind = 'listing' THEN
      NEW.route_planning_enabled := false;
      NEW.accounting_integration_enabled := false;
      NEW.extra_employee_logins := 0;
      NEW.monthly_price_dkk := 0;
      RETURN NEW;
    END IF;
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
    NEW.locked_extra_employee_logins := 0;
    NEW.stripe_customer_id := NULL;
    NEW.stripe_subscription_id := NULL;
    IF NEW.plan_kind = 'listing' THEN
      NEW.status := 'active';
      NEW.trial_ends_at := NULL;
      NEW.route_planning_enabled := false;
      NEW.accounting_integration_enabled := false;
      NEW.extra_employee_logins := 0;
      NEW.monthly_price_dkk := 0;
      RETURN NEW;
    END IF;
    NEW.status := 'trialing';
    IF NEW.trial_ends_at IS NULL OR NEW.trial_ends_at > now() + interval '31 days' THEN
      NEW.trial_ends_at := now() + interval '30 days';
    END IF;
    NEW.extra_employee_logins := LEAST(GREATEST(coalesce(NEW.extra_employee_logins,0),0), 50);
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.set_business_plan_kind(_business_id uuid, _kind text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_plan public.business_plans%ROWTYPE;
  v_days int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = _business_id AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'Kun virksomhedens ejer kan ændre abonnementstypen.';
  END IF;
  IF _kind NOT IN ('listing','full') THEN
    RAISE EXCEPTION 'Ugyldig plantype.';
  END IF;
  PERFORM set_config('app.plan_kind_rpc', '1', true);
  SELECT * INTO v_plan FROM public.business_plans WHERE business_id = _business_id FOR UPDATE;
  SELECT trial_days INTO v_days FROM public.platform_settings WHERE id = 1;
  v_days := LEAST(GREATEST(COALESCE(v_days, 30), 0), 365);

  IF v_plan.id IS NULL THEN
    INSERT INTO public.business_plans (business_id, plan_kind, status, trial_ends_at, monthly_price_dkk, route_planning_enabled)
    VALUES (_business_id, _kind,
            CASE WHEN _kind = 'full' THEN 'trialing' ELSE 'active' END,
            CASE WHEN _kind = 'full' THEN now() + make_interval(days => v_days) END, 0, _kind = 'full');
  ELSIF v_plan.plan_kind <> _kind THEN
    IF _kind = 'full' THEN
      UPDATE public.business_plans
         SET plan_kind = 'full', status = 'trialing', route_planning_enabled = true,
             trial_ends_at = now() + make_interval(days => v_days), updated_at = now()
       WHERE id = v_plan.id;
    ELSE
      IF v_plan.stripe_subscription_id IS NOT NULL AND v_plan.status IN ('active','trialing','past_due') THEN
        RAISE EXCEPTION 'Opsig først dit betalte abonnement, før du skifter til Kun profil.';
      END IF;
      IF EXISTS (SELECT 1 FROM public.routes WHERE business_id = _business_id AND route_date >= current_date AND COALESCE(status,'') NOT IN ('archived','completed')) THEN
        RAISE EXCEPTION 'Du har planlagte ruter. Afslut eller slet dem først, før du skifter til Kun profil.';
      END IF;
      IF EXISTS (SELECT 1 FROM public.agreements WHERE business_id = _business_id AND status IN ('active','paused','pending_approval')) THEN
        RAISE EXCEPTION 'Du har aktive aftaler. Afslut dem først, før du skifter til Kun profil.';
      END IF;
      UPDATE public.business_plans
         SET plan_kind = 'listing', status = 'active', trial_ends_at = NULL, monthly_price_dkk = 0,
             route_planning_enabled = false, accounting_integration_enabled = false, extra_employee_logins = 0, updated_at = now()
       WHERE id = v_plan.id;
    END IF;
  END IF;
  PERFORM set_config('app.plan_kind_rpc', '', true);
  RETURN jsonb_build_object('plan_kind', _kind);
END $$;
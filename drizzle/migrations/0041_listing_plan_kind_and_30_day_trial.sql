ALTER TABLE public.platform_settings ALTER COLUMN trial_days SET DEFAULT 30;

ALTER TABLE public.business_plans ADD COLUMN IF NOT EXISTS plan_kind text NOT NULL DEFAULT 'full';
COMMENT ON COLUMN public.business_plans.plan_kind IS 'listing = kun offentlig profil (ingen ruter/medarbejdere/aftaler/regnskab); full = fuldt system';

CREATE OR REPLACE FUNCTION public._validate_plan_kind()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.plan_kind NOT IN ('listing','full') THEN
    RAISE EXCEPTION 'Ugyldig plantype: %', NEW.plan_kind;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_validate_plan_kind ON public.business_plans;
CREATE TRIGGER trg_validate_plan_kind BEFORE INSERT OR UPDATE OF plan_kind ON public.business_plans
FOR EACH ROW EXECUTE FUNCTION public._validate_plan_kind();

-- Hold businesses.settings.route_planning_enabled synkron med plantypen (gammel kode læser settings).
CREATE OR REPLACE FUNCTION public._sync_plan_kind_to_settings()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.businesses
     SET settings = jsonb_set(COALESCE(settings,'{}'::jsonb), '{route_planning_enabled}', to_jsonb(NEW.plan_kind = 'full'))
   WHERE id = NEW.business_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_sync_plan_kind_settings ON public.business_plans;
CREATE TRIGGER trg_sync_plan_kind_settings AFTER INSERT OR UPDATE OF plan_kind ON public.business_plans
FOR EACH ROW EXECUTE FUNCTION public._sync_plan_kind_to_settings();

CREATE OR REPLACE FUNCTION public.business_is_listing_only(_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.business_plans WHERE business_id = _business_id AND plan_kind = 'listing');
$$;

CREATE OR REPLACE FUNCTION public._guard_listing_only_operations()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.business_id IS NULL OR NOT public.business_is_listing_only(NEW.business_id) THEN
    RETURN NEW;
  END IF;
  -- Ejeren må altid have sin egen medarbejderrække (oprettes automatisk).
  IF TG_TABLE_NAME = 'employees' AND NEW.user_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = NEW.business_id AND b.owner_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Denne funktion kræver det fulde system. Opgradér under Indstillinger for at bruge ruter, medarbejdere, aftaler og regnskab.'
    USING ERRCODE = 'P0001';
END $$;

DROP TRIGGER IF EXISTS trg_listing_guard ON public.routes;
CREATE TRIGGER trg_listing_guard BEFORE INSERT ON public.routes FOR EACH ROW EXECUTE FUNCTION public._guard_listing_only_operations();
DROP TRIGGER IF EXISTS trg_listing_guard ON public.employees;
CREATE TRIGGER trg_listing_guard BEFORE INSERT ON public.employees FOR EACH ROW EXECUTE FUNCTION public._guard_listing_only_operations();
DROP TRIGGER IF EXISTS trg_listing_guard ON public.agreements;
CREATE TRIGGER trg_listing_guard BEFORE INSERT ON public.agreements FOR EACH ROW EXECUTE FUNCTION public._guard_listing_only_operations();
DROP TRIGGER IF EXISTS trg_listing_guard ON public.accounting_sync_queue;
CREATE TRIGGER trg_listing_guard BEFORE INSERT ON public.accounting_sync_queue FOR EACH ROW EXECUTE FUNCTION public._guard_listing_only_operations();

-- Skift plantype (ejer). Opgradering starter prøveperiode; nedgradering kræver at intet aktivt kører.
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
  SELECT * INTO v_plan FROM public.business_plans WHERE business_id = _business_id FOR UPDATE;
  SELECT COALESCE(trial_days, 30) INTO v_days FROM public.platform_settings WHERE id = 1;
  v_days := COALESCE(v_days, 30);

  IF v_plan.id IS NULL THEN
    INSERT INTO public.business_plans (business_id, plan_kind, status, trial_ends_at, monthly_price_dkk)
    VALUES (_business_id, _kind,
            CASE WHEN _kind = 'full' THEN 'trialing' ELSE 'active' END,
            CASE WHEN _kind = 'full' THEN now() + make_interval(days => v_days) END, 0);
    RETURN jsonb_build_object('plan_kind', _kind);
  END IF;

  IF v_plan.plan_kind = _kind THEN
    RETURN jsonb_build_object('plan_kind', _kind);
  END IF;

  IF _kind = 'full' THEN
    UPDATE public.business_plans
       SET plan_kind = 'full', status = 'trialing',
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
       SET plan_kind = 'listing', status = 'active', trial_ends_at = NULL, monthly_price_dkk = 0, updated_at = now()
     WHERE id = v_plan.id;
  END IF;
  RETURN jsonb_build_object('plan_kind', _kind);
END $$;

REVOKE ALL ON FUNCTION public.set_business_plan_kind(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_business_plan_kind(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.business_is_listing_only(uuid) TO authenticated, service_role;

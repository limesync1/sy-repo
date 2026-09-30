
CREATE SCHEMA IF NOT EXISTS internal;
REVOKE ALL ON SCHEMA internal FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS internal.cron_tokens (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON internal.cron_tokens FROM PUBLIC, anon, authenticated;
INSERT INTO internal.cron_tokens (id, token)
VALUES (1, encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (id) DO UPDATE SET token = EXCLUDED.token, created_at = now();

CREATE OR REPLACE FUNCTION public.verify_cron_token(_token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = internal, public AS $$
  SELECT EXISTS (SELECT 1 FROM internal.cron_tokens WHERE id = 1 AND token = _token)
$$;
REVOKE ALL ON FUNCTION public.verify_cron_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_cron_token(text) TO service_role;

CREATE OR REPLACE FUNCTION internal.cron_call(_fn text, _body jsonb DEFAULT '{}'::jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = internal, public AS $$
DECLARE t text; base text;
BEGIN
  SELECT token INTO t FROM internal.cron_tokens WHERE id = 1;
  base := 'https://gkectsellkpltrxvusot.supabase.co/functions/v1/';
  RETURN net.http_post(
    url := base || _fn,
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || t),
    body := _body
  );
END $$;
REVOKE ALL ON FUNCTION internal.cron_call(text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_create_impersonation_code(p_business_id uuid)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_code text;
  v_attempts int := 0;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can create impersonation codes';
  END IF;
  LOOP
    v_code := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint % 90000) + 10000)::text, 5, '0');
    BEGIN
      INSERT INTO public.admin_impersonation_codes (code, business_id, admin_user_id, expires_at)
      VALUES (v_code, p_business_id, auth.uid(), now() + interval '15 minutes');
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      v_attempts := v_attempts + 1;
      IF v_attempts > 20 THEN RAISE EXCEPTION 'Could not generate unique code'; END IF;
    END;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public._is_trusted_writer()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(auth.role(), '') = 'service_role'
      OR session_user IN ('postgres','supabase_admin')
      OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role))
$$;
REVOKE ALL ON FUNCTION public._is_trusted_writer() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._is_trusted_writer() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public._guard_business_plan_owner_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE in_trial boolean;
BEGIN
  IF public._is_trusted_writer() THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    NEW.trial_ends_at := OLD.trial_ends_at;
    NEW.locked_extra_employee_logins := OLD.locked_extra_employee_logins;
    NEW.locked_accounting_integration := OLD.locked_accounting_integration;
    NEW.locked_at := OLD.locked_at;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
    NEW.stripe_subscription_id := OLD.stripe_subscription_id;
    NEW.stripe_price_id := OLD.stripe_price_id;
    NEW.current_period_end := OLD.current_period_end;
    in_trial := OLD.status = 'trialing' AND OLD.trial_ends_at IS NOT NULL AND OLD.trial_ends_at > now();
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
END $$;
DROP TRIGGER IF EXISTS trg_guard_business_plan_owner_changes ON public.business_plans;
CREATE TRIGGER trg_guard_business_plan_owner_changes
BEFORE INSERT OR UPDATE ON public.business_plans
FOR EACH ROW EXECUTE FUNCTION public._guard_business_plan_owner_changes();

CREATE OR REPLACE FUNCTION public._guard_untrusted_order_item()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o record; s record;
BEGIN
  IF public._is_trusted_writer() THEN RETURN NEW; END IF;
  SELECT id, business_id INTO o FROM public.orders WHERE id = NEW.order_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Ordre findes ikke'; END IF;
  IF auth.uid() IS NOT NULL AND public.is_business_owner(o.business_id, auth.uid()) THEN RETURN NEW; END IF;
  IF NEW.service_id IS NULL THEN RAISE EXCEPTION 'Service mangler'; END IF;
  SELECT id, business_id, pricing_type, base_price, is_active, name INTO s FROM public.services WHERE id = NEW.service_id;
  IF s.id IS NULL OR s.business_id <> o.business_id OR NOT s.is_active THEN
    RAISE EXCEPTION 'Ugyldig service for denne virksomhed';
  END IF;
  NEW.quantity := LEAST(GREATEST(coalesce(NEW.quantity, 1), 0), 10000);
  IF s.pricing_type IN ('fast_pris','timepris') THEN
    NEW.unit_price := coalesce(s.base_price, 0);
  ELSE
    NEW.unit_price := LEAST(GREATEST(coalesce(NEW.unit_price, 0), 0), 1000000);
  END IF;
  NEW.total_price := LEAST(round(NEW.unit_price * NEW.quantity, 2), 1000000);
  NEW.service_name := s.name;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_untrusted_order_item ON public.order_items;
CREATE TRIGGER trg_guard_untrusted_order_item
BEFORE INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public._guard_untrusted_order_item();

CREATE OR REPLACE FUNCTION public._sync_untrusted_order_total()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE biz uuid;
BEGIN
  IF public._is_trusted_writer() THEN RETURN NULL; END IF;
  SELECT business_id INTO biz FROM public.orders WHERE id = NEW.order_id;
  IF auth.uid() IS NOT NULL AND public.is_business_owner(biz, auth.uid()) THEN RETURN NULL; END IF;
  UPDATE public.orders
     SET total_amount = (SELECT coalesce(sum(total_price),0) FROM public.order_items WHERE order_id = NEW.order_id)
   WHERE id = NEW.order_id;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_sync_untrusted_order_total ON public.order_items;
CREATE TRIGGER trg_sync_untrusted_order_total
AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public._sync_untrusted_order_total();

CREATE OR REPLACE FUNCTION public._guard_untrusted_order_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public._is_trusted_writer() THEN RETURN NEW; END IF;
  IF auth.uid() IS NOT NULL AND public.is_business_owner(NEW.business_id, auth.uid()) THEN RETURN NEW; END IF;
  NEW.total_amount := 0;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_untrusted_order_insert ON public.orders;
CREATE TRIGGER trg_guard_untrusted_order_insert
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public._guard_untrusted_order_insert();

CREATE OR REPLACE FUNCTION public._guard_customer_subscription_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o record; p numeric;
BEGIN
  IF public._is_trusted_writer() THEN RETURN NEW; END IF;
  IF auth.uid() IS NOT NULL AND public.is_business_owner(NEW.business_id, auth.uid()) THEN RETURN NEW; END IF;
  SELECT id, business_id, customer_id, adjusted_details INTO o FROM public.orders WHERE id = NEW.order_id;
  IF o.id IS NULL OR o.customer_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Abonnement skal høre til din egen ordre';
  END IF;
  NEW.business_id := o.business_id;
  SELECT (it->>'total_price')::numeric INTO p
    FROM jsonb_array_elements(coalesce(o.adjusted_details->'items','[]'::jsonb)) it
   WHERE it->>'service_id' = NEW.service_id::text
     AND (it->>'total_price') ~ '^[0-9]+(\.[0-9]+)?$'
   LIMIT 1;
  IF p IS NULL THEN
    SELECT total_price INTO p FROM public.order_items WHERE order_id = o.id AND service_id = NEW.service_id LIMIT 1;
  END IF;
  NEW.total_price := coalesce(p, 0);
  NEW.status := 'active';
  NEW.paused_at := NULL;
  NEW.cancelled_at := NULL;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_customer_subscription_insert ON public.subscriptions;
CREATE TRIGGER trg_guard_customer_subscription_insert
BEFORE INSERT ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public._guard_customer_subscription_insert();

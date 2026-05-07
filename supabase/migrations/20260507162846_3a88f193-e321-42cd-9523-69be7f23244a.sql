
-- 1) Fjern den for strenge unikke index der blokerede legitime bestillinger
DROP INDEX IF EXISTS public.uq_subscriptions_order_service;

-- 2) Gør auto-create triggers idempotente med ON CONFLICT DO NOTHING (belt & suspenders)
CREATE OR REPLACE FUNCTION public.auto_create_subscription_from_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_interval text;
  v_status text;
BEGIN
  v_interval := COALESCE(NEW.details->>'interval', NULL);
  IF v_interval IS NULL OR v_interval = 'engangskøb' THEN RETURN NEW; END IF;

  SELECT id, business_id, customer_id, status, requires_customer_approval
    INTO v_order FROM public.orders WHERE id = NEW.order_id;
  IF NOT FOUND OR v_order.status = 'cancelled' THEN RETURN NEW; END IF;

  -- Spring over hvis der allerede findes en sub for præcis samme service+order+interval
  IF EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.order_id = NEW.order_id
      AND COALESCE(s.service_id::text, '') = COALESCE(NEW.service_id::text, '')
      AND COALESCE(s.interval, '') = COALESCE(v_interval, '')
  ) THEN RETURN NEW; END IF;

  v_status := CASE
    WHEN v_order.status = 'pending' AND COALESCE(v_order.requires_customer_approval, false) THEN 'pending'
    ELSE 'active'
  END;

  BEGIN
    INSERT INTO public.subscriptions (
      business_id, customer_id, service_id, order_id,
      service_name, interval, status, details, total_price
    ) VALUES (
      v_order.business_id, v_order.customer_id, NEW.service_id, NEW.order_id,
      NEW.service_name, v_interval, v_status, NEW.details, NEW.total_price
    );
  EXCEPTION WHEN unique_violation THEN
    -- Ignorer — en parallel trigger har allerede oprettet sub'en
    NULL;
  END;
  RETURN NEW;
END;
$$;

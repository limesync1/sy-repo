-- Sørg for at abonnementer altid får en next_service_date sat fra
-- ordrens preferred_date, så ruteplanlæggerens projektioner og opstartsdato-
-- validering altid har den rigtige dato at arbejde med.
CREATE OR REPLACE FUNCTION public.auto_create_subscription_from_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_order RECORD;
  v_interval text;
  v_status text;
  v_seed date;
BEGIN
  v_interval := COALESCE(NEW.details->>'interval', NULL);
  IF v_interval IS NULL OR v_interval = 'engangskøb' THEN RETURN NEW; END IF;

  SELECT id, business_id, customer_id, customer_name, customer_email, status,
         requires_customer_approval, preferred_date, next_service_date
    INTO v_order FROM public.orders WHERE id = NEW.order_id;
  IF NOT FOUND OR v_order.status = 'cancelled' THEN RETURN NEW; END IF;

  IF EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.order_id = NEW.order_id
      AND COALESCE(s.service_id::text, '') = COALESCE(NEW.service_id::text, '')
      AND s.status <> 'cancelled'
  ) THEN RETURN NEW; END IF;

  v_status := CASE
    WHEN v_order.status = 'pending' AND COALESCE(v_order.requires_customer_approval, false) THEN 'pending'
    ELSE 'active'
  END;

  -- Foretræk eksplicit opstartsdato fra ordren — falder tilbage til i dag
  -- så abonnementet altid har en seed-dato til projektionen.
  v_seed := COALESCE(v_order.preferred_date, v_order.next_service_date, current_date);

  INSERT INTO public.subscriptions (
    business_id, customer_id, customer_email, customer_name, service_id, order_id,
    service_name, interval, status, details, total_price, next_service_date
  ) VALUES (
    v_order.business_id, v_order.customer_id, lower(v_order.customer_email), v_order.customer_name, NEW.service_id, NEW.order_id,
    NEW.service_name, v_interval, v_status, NEW.details, NEW.total_price, v_seed
  );
  RETURN NEW;
END;
$function$;

-- Samme opdatering på den anden trigger der opretter abonnementer fra ordre.
CREATE OR REPLACE FUNCTION public.auto_create_subscriptions_from_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_item RECORD;
  v_interval text;
  v_status text;
  v_seed date;
BEGIN
  IF NEW.status = 'cancelled' THEN RETURN NEW; END IF;

  v_seed := COALESCE(NEW.preferred_date, NEW.next_service_date, current_date);

  FOR v_item IN
    SELECT id, service_id, service_name, total_price, details
    FROM public.order_items
    WHERE order_id = NEW.id
  LOOP
    v_interval := COALESCE(v_item.details->>'interval', NULL);
    IF v_interval IS NULL OR v_interval = 'engangskøb' THEN CONTINUE; END IF;

    IF EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.order_id = NEW.id
        AND COALESCE(s.service_id::text, '') = COALESCE(v_item.service_id::text, '')
    ) THEN CONTINUE; END IF;

    v_status := CASE
      WHEN NEW.status IN ('pending') AND COALESCE(NEW.requires_customer_approval, false) THEN 'pending'
      ELSE 'active'
    END;

    INSERT INTO public.subscriptions (
      business_id, customer_id, service_id, order_id,
      service_name, interval, status, details, total_price, next_service_date
    ) VALUES (
      NEW.business_id, NEW.customer_id, v_item.service_id, NEW.id,
      v_item.service_name, v_interval, v_status, v_item.details, v_item.total_price, v_seed
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Bagudfyld manglende next_service_date på eksisterende abonnementer
-- ud fra den oprindelige ordres preferred_date.
UPDATE public.subscriptions s
SET next_service_date = COALESCE(o.preferred_date, o.next_service_date, s.created_at::date)
FROM public.orders o
WHERE s.order_id = o.id
  AND s.next_service_date IS NULL;
-- Harden order ownership and allow pending guest/manual subscriptions without null failures

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS customer_name text;

ALTER TABLE public.subscriptions
  ALTER COLUMN customer_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.is_business_owner(_business_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = _business_id
      AND b.owner_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.normalize_order_customer_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid;
  v_email text;
  v_is_owner boolean;
BEGIN
  v_uid := auth.uid();
  v_email := lower(nullif(coalesce(auth.jwt() ->> 'email', ''), ''));

  IF v_uid IS NULL THEN
    IF TG_OP = 'INSERT' THEN
      NEW.customer_id := NULL;
    END IF;
    RETURN NEW;
  END IF;

  v_is_owner := public.is_business_owner(NEW.business_id, v_uid) OR public.has_role(v_uid, 'admin');

  -- Business owners/admins may create and maintain manual customer orders for their own business.
  IF v_is_owner THEN
    IF NEW.customer_email IS NOT NULL THEN
      NEW.customer_email := lower(NEW.customer_email);
    END IF;
    RETURN NEW;
  END IF;

  -- Normal customers can only create/update orders as themselves.
  NEW.customer_id := v_uid;
  IF v_email IS NOT NULL THEN
    NEW.customer_email := v_email;
  ELSIF NEW.customer_email IS NOT NULL THEN
    NEW.customer_email := lower(NEW.customer_email);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_normalize_customer_identity ON public.orders;
CREATE TRIGGER trg_orders_normalize_customer_identity
BEFORE INSERT OR UPDATE OF customer_id, customer_email, business_id ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.normalize_order_customer_identity();

DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Guests can create unclaimed orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can create own orders" ON public.orders;
DROP POLICY IF EXISTS "Business owners can create manual orders" ON public.orders;

CREATE POLICY "Guests can create unclaimed orders"
ON public.orders
FOR INSERT
WITH CHECK (auth.uid() IS NULL AND customer_id IS NULL);

CREATE POLICY "Customers can create own orders"
ON public.orders
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND customer_id = auth.uid()
  AND lower(customer_email) = lower(coalesce(auth.jwt() ->> 'email', customer_email))
);

CREATE POLICY "Business owners can create manual orders"
ON public.orders
FOR INSERT
WITH CHECK (public.is_business_owner(business_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Customers can view own order items" ON public.order_items;
CREATE POLICY "Customers can view own order items"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.customer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Anyone can create subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Customers can create own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Business owners can create customer subscriptions" ON public.subscriptions;

CREATE POLICY "Customers can create own subscriptions"
ON public.subscriptions
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND customer_id = auth.uid());

CREATE POLICY "Business owners can create customer subscriptions"
ON public.subscriptions
FOR INSERT
WITH CHECK (public.is_business_owner(business_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Order rows are inserted before order_items, so this trigger was a no-op at best and a duplicate risk later.
DROP TRIGGER IF EXISTS trg_auto_create_subscriptions ON public.orders;

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

  SELECT id, business_id, customer_id, customer_name, customer_email, status, requires_customer_approval
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

  INSERT INTO public.subscriptions (
    business_id, customer_id, customer_email, customer_name, service_id, order_id,
    service_name, interval, status, details, total_price
  ) VALUES (
    v_order.business_id, v_order.customer_id, lower(v_order.customer_email), v_order.customer_name, NEW.service_id, NEW.order_id,
    NEW.service_name, v_interval, v_status, NEW.details, NEW.total_price
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_subscription_from_item ON public.order_items;
CREATE TRIGGER trg_auto_create_subscription_from_item
AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.auto_create_subscription_from_item();

CREATE OR REPLACE FUNCTION public.link_orders_to_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    UPDATE public.orders
       SET customer_id = NEW.id
     WHERE customer_id IS NULL
       AND lower(customer_email) = lower(NEW.email);

    UPDATE public.subscriptions s
       SET customer_id = NEW.id,
           customer_email = lower(coalesce(s.customer_email, o.customer_email)),
           customer_name = coalesce(s.customer_name, o.customer_name)
      FROM public.orders o
     WHERE s.order_id = o.id
       AND s.customer_id IS NULL
       AND lower(coalesce(s.customer_email, o.customer_email)) = lower(NEW.email);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_link_orders ON auth.users;
CREATE TRIGGER on_auth_user_created_link_orders
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.link_orders_to_new_user();

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_email ON public.subscriptions(lower(customer_email)) WHERE customer_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_customer_email_null_customer ON public.orders(lower(customer_email)) WHERE customer_id IS NULL;
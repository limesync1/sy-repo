-- Backfill + auto-link orders to a user account when signup matches the order email
CREATE OR REPLACE FUNCTION public.link_orders_to_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    UPDATE public.orders
       SET customer_id = NEW.id
     WHERE customer_id IS NULL
       AND lower(customer_email) = lower(NEW.email);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_link_orders ON auth.users;
CREATE TRIGGER on_auth_user_created_link_orders
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.link_orders_to_new_user();
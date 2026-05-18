
CREATE OR REPLACE FUNCTION public.get_customer_notification_pref(p_email text, p_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_settings jsonb;
  v_val jsonb;
BEGIN
  IF p_email IS NULL OR p_key IS NULL THEN
    RETURN true;
  END IF;
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN true; -- ingen konto → ingen præferencer; tillad afsendelse
  END IF;
  SELECT notification_settings INTO v_settings FROM public.profiles WHERE user_id = v_user_id LIMIT 1;
  IF v_settings IS NULL THEN
    RETURN true;
  END IF;
  v_val := v_settings -> p_key;
  IF v_val IS NULL THEN
    RETURN true; -- ikke eksplicit sat → tillad
  END IF;
  RETURN (v_val::text)::boolean;
EXCEPTION WHEN OTHERS THEN
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.get_customer_notification_pref(text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_notification_pref(text, text) TO service_role;

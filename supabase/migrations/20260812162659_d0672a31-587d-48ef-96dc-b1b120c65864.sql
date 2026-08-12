DROP POLICY IF EXISTS "Profiles safe columns readable" ON public.profiles;

CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = off) AS
SELECT user_id, display_name, avatar_url
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

ALTER FUNCTION public.generate_business_public_id() SET search_path = public;
ALTER FUNCTION public.set_customer_zone_key() SET search_path = public;
ALTER FUNCTION public.set_business_public_id() SET search_path = public;
ALTER FUNCTION public.derive_zone_key(zip text) SET search_path = public;
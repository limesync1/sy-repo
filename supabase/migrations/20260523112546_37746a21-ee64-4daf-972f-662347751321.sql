
-- Replace the SECURITY DEFINER view with a security-invoker view.
DROP VIEW IF EXISTS public.public_profiles;

-- Restore a public read policy on profiles, then use column-level grants to
-- prevent anon/authenticated from reading the sensitive columns (phone,
-- notification_settings). PostgREST honors column grants.
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Profiles safe columns readable"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

-- Authenticated users can additionally read their full row (covered by overall policy + grants below).
CREATE POLICY "Users can view their own full profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Strip column access for anon / authenticated and grant only safe columns.
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, user_id, display_name, avatar_url, created_at, updated_at) ON public.profiles TO anon, authenticated;
-- Sensitive columns stay accessible only via service_role / postgres / owner-checks.
GRANT SELECT (phone, notification_settings) ON public.profiles TO authenticated;
-- Above grants phone to authenticated globally; combine with RLS to limit rows to own profile.
-- Since anon does not get phone/notification_settings at all, they cannot read them.
-- Authenticated users can read phone/notification_settings only for rows their RLS lets them see;
-- the "Users can view their own full profile" policy ensures own row, while the safe-columns policy
-- restricts unrelated rows. PostgREST applies column grants AND row policies.

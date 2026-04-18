-- 1) Auto-create profiles for new auth users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2) Backfill profiles for existing auth users that don't have one
INSERT INTO public.profiles (user_id, display_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL;

-- 3) Admin users overview (joins profile + auth email + roles)
CREATE OR REPLACE VIEW public.admin_users_overview
WITH (security_invoker = on) AS
SELECT
  u.id AS user_id,
  u.email,
  u.created_at AS auth_created_at,
  u.last_sign_in_at,
  p.display_name,
  p.phone,
  p.avatar_url,
  COALESCE(
    (SELECT array_agg(role::text ORDER BY role::text) FROM public.user_roles ur WHERE ur.user_id = u.id),
    ARRAY[]::text[]
  ) AS roles,
  (SELECT count(*) FROM public.orders o WHERE o.customer_id = u.id) AS orders_count,
  (SELECT count(*) FROM public.businesses b WHERE b.owner_id = u.id) AS businesses_count
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id;

-- Restrict view to admins only via a wrapper RLS check at query time:
-- security_invoker means the caller's RLS applies. But since auth.users isn't directly readable
-- by clients, we expose this only through a SECURITY DEFINER function below.
REVOKE ALL ON public.admin_users_overview FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  auth_created_at timestamptz,
  last_sign_in_at timestamptz,
  display_name text,
  phone text,
  avatar_url text,
  roles text[],
  orders_count bigint,
  businesses_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can list users';
  END IF;
  RETURN QUERY SELECT * FROM public.admin_users_overview ORDER BY auth_created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

-- 4) Admin business stats (revenue, order counts) — admin-only function
CREATE OR REPLACE FUNCTION public.admin_business_stats()
RETURNS TABLE (
  business_id uuid,
  total_revenue numeric,
  completed_revenue numeric,
  orders_count bigint,
  pending_count bigint,
  owner_email text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can view business stats';
  END IF;
  RETURN QUERY
  SELECT
    b.id AS business_id,
    COALESCE(SUM(o.total_amount), 0)::numeric AS total_revenue,
    COALESCE(SUM(o.total_amount) FILTER (WHERE o.status = 'completed'), 0)::numeric AS completed_revenue,
    COUNT(o.id) AS orders_count,
    COUNT(o.id) FILTER (WHERE o.status = 'pending') AS pending_count,
    u.email::text AS owner_email
  FROM public.businesses b
  LEFT JOIN public.orders o ON o.business_id = b.id
  LEFT JOIN auth.users u ON u.id = b.owner_id
  GROUP BY b.id, u.email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_business_stats() TO authenticated;

-- 5) Admin: promote / demote a user role
CREATE OR REPLACE FUNCTION public.admin_set_user_role(_user_id uuid, _role app_role, _grant boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change roles';
  END IF;
  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, app_role, boolean) TO authenticated;
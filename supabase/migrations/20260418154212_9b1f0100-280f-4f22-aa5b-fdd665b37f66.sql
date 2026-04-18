CREATE OR REPLACE FUNCTION public.admin_list_users()
 RETURNS TABLE(user_id uuid, email text, auth_created_at timestamp with time zone, last_sign_in_at timestamp with time zone, display_name text, phone text, avatar_url text, roles text[], orders_count bigint, businesses_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can list users';
  END IF;
  RETURN QUERY
    SELECT
      v.user_id,
      v.email::text,
      v.auth_created_at,
      v.last_sign_in_at,
      v.display_name,
      v.phone,
      v.avatar_url,
      v.roles,
      v.orders_count,
      v.businesses_count
    FROM public.admin_users_overview v
    ORDER BY v.auth_created_at DESC;
END;
$function$;
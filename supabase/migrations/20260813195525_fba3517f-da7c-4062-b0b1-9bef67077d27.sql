DROP POLICY IF EXISTS "Anyone can view conversation by session token" ON public.chat_conversations;

DROP VIEW IF EXISTS public.profiles_public;

CREATE OR REPLACE FUNCTION public.get_public_profiles(p_user_ids uuid[])
RETURNS TABLE (user_id uuid, display_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.display_name, p.avatar_url
  FROM public.profiles p
  WHERE p.user_id = ANY(p_user_ids)
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view orders with valid approval token" ON public.orders;
DROP POLICY IF EXISTS "Public can view grouped orders via approval token" ON public.orders;
DROP POLICY IF EXISTS "Public can view order_items via approval token" ON public.order_items;
DROP POLICY IF EXISTS "Public can view grouped order_items via approval token" ON public.order_items;

CREATE OR REPLACE FUNCTION public.get_order_for_approval(p_order_id uuid, p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
  v_group uuid;
  v_items jsonb;
  v_total numeric;
  v_biz jsonb;
BEGIN
  IF p_order_id IS NULL OR coalesce(p_token, '') = '' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_id
    AND o.approval_token = p_token
    AND o.requires_customer_approval = true
    AND (o.approval_expires_at IS NULL OR o.approval_expires_at > now());

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_group := coalesce(v_order.parent_order_id, v_order.id);

  SELECT coalesce(jsonb_agg(to_jsonb(oi)), '[]'::jsonb) INTO v_items
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.id = v_group OR o.parent_order_id = v_group;

  SELECT coalesce(sum(o.total_amount), 0) INTO v_total
  FROM public.orders o
  WHERE o.id = v_group OR o.parent_order_id = v_group;

  SELECT to_jsonb(b) INTO v_biz
  FROM (
    SELECT id, name, logo_url, phone, email
    FROM public.businesses
    WHERE id = v_order.business_id
  ) b;

  RETURN jsonb_build_object(
    'order', (to_jsonb(v_order) - 'approval_token'),
    'items', v_items,
    'total_amount', v_total,
    'business', v_biz
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_for_approval(uuid, text) TO anon, authenticated;
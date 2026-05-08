CREATE OR REPLACE FUNCTION public.order_group_has_active_approval_token(_parent_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders parent
    WHERE parent.parent_order_id = _parent_order_id
      AND parent.approval_token IS NOT NULL
      AND parent.requires_customer_approval = true
      AND (parent.approval_expires_at IS NULL OR parent.approval_expires_at > now())
  )
$$;

DROP POLICY IF EXISTS "Public can view grouped orders via approval token" ON public.orders;
CREATE POLICY "Public can view grouped orders via approval token"
ON public.orders
FOR SELECT
USING (
  parent_order_id IS NOT NULL
  AND public.order_group_has_active_approval_token(parent_order_id)
);

DROP POLICY IF EXISTS "Public can view grouped order_items via approval token" ON public.order_items;
CREATE POLICY "Public can view grouped order_items via approval token"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.orders child
    WHERE child.id = order_items.order_id
      AND child.parent_order_id IS NOT NULL
      AND public.order_group_has_active_approval_token(child.parent_order_id)
  )
);
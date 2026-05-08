DROP POLICY IF EXISTS "Public can view grouped orders via approval token" ON public.orders;
CREATE POLICY "Public can view grouped orders via approval token"
ON public.orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.orders parent
    WHERE parent.approval_token IS NOT NULL
      AND parent.requires_customer_approval = true
      AND (parent.approval_expires_at IS NULL OR parent.approval_expires_at > now())
      AND parent.parent_order_id = orders.parent_order_id
  )
);

DROP POLICY IF EXISTS "Public can view grouped order_items via approval token" ON public.order_items;
CREATE POLICY "Public can view grouped order_items via approval token"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.orders child
    JOIN public.orders parent ON parent.parent_order_id = child.parent_order_id
    WHERE child.id = order_items.order_id
      AND parent.approval_token IS NOT NULL
      AND parent.requires_customer_approval = true
      AND (parent.approval_expires_at IS NULL OR parent.approval_expires_at > now())
  )
);
-- Add approval token fields to orders for manual order creation flow
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS approval_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS approval_expires_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS requires_customer_approval boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_approval_token ON public.orders(approval_token) WHERE approval_token IS NOT NULL;

-- Allow public read of an order ONLY when a valid approval token is provided.
-- The customer-approve-order edge function uses the service role to update,
-- so we only need a SELECT policy here so the public approval page can fetch the order.
CREATE POLICY "Public can view orders with valid approval token"
ON public.orders
FOR SELECT
TO anon, authenticated
USING (
  approval_token IS NOT NULL
  AND requires_customer_approval = true
  AND (approval_expires_at IS NULL OR approval_expires_at > now())
);

-- Same for order_items so the approval page can show line items
CREATE POLICY "Public can view order_items via approval token"
ON public.order_items
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.approval_token IS NOT NULL
      AND o.requires_customer_approval = true
      AND (o.approval_expires_at IS NULL OR o.approval_expires_at > now())
  )
);
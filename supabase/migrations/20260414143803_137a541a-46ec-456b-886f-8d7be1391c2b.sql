-- Add customer_id to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add customer_response column (accepted / rejected / null)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_response text;

-- Customers can view their own orders
CREATE POLICY "Customers can view their own orders"
ON public.orders FOR SELECT
TO authenticated
USING (auth.uid() = customer_id);

-- Customers can update customer_response on their own orders
CREATE POLICY "Customers can respond to their orders"
ON public.orders FOR UPDATE
TO authenticated
USING (auth.uid() = customer_id)
WITH CHECK (auth.uid() = customer_id);
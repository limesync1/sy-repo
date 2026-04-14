-- Add business response fields to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS business_response text DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS business_message text DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS adjusted_amount numeric DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS adjusted_details jsonb DEFAULT NULL;
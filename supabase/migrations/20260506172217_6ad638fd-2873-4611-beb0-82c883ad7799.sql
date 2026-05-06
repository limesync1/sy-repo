
ALTER TABLE public.business_customers
  ADD COLUMN IF NOT EXISTS customer_number text,
  ADD COLUMN IF NOT EXISTS customer_group text,
  ADD COLUMN IF NOT EXISTS vat_zone text,
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;

ALTER TABLE public.private_customers
  ADD COLUMN IF NOT EXISTS customer_number text,
  ADD COLUMN IF NOT EXISTS customer_group text,
  ADD COLUMN IF NOT EXISTS vat_zone text,
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ean_number text;

CREATE INDEX IF NOT EXISTS idx_business_customers_customer_number
  ON public.business_customers(business_id, customer_number)
  WHERE customer_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_private_customers_customer_number
  ON public.private_customers(business_id, customer_number)
  WHERE customer_number IS NOT NULL;

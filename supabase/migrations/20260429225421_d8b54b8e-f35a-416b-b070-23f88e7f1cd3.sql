ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS accounting_product_group text,
  ADD COLUMN IF NOT EXISTS accounting_income_account text;
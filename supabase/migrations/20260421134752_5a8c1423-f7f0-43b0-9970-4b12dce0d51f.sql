ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cvr text,
  ADD COLUMN IF NOT EXISTS company_name text;
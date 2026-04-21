ALTER TABLE public.private_customers ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.business_customers ADD COLUMN IF NOT EXISTS avatar_url text;
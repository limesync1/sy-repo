ALTER TABLE public.businesses
  ALTER COLUMN public_id SET DEFAULT public.generate_business_public_id();
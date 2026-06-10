
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS allow_early_completion_default boolean NOT NULL DEFAULT false;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS early_completion_mode text NOT NULL DEFAULT 'inherit'
  CHECK (early_completion_mode IN ('inherit','always','never'));

ALTER TABLE public.routes
  ADD COLUMN IF NOT EXISTS allow_early_completion boolean NOT NULL DEFAULT false;

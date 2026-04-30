UPDATE public.platform_settings SET price_accounting_integration_dkk = 0, updated_at = now();
ALTER TABLE public.platform_settings ALTER COLUMN price_accounting_integration_dkk SET DEFAULT 0;
ALTER TABLE public.accounting_integrations
  DROP CONSTRAINT IF EXISTS accounting_integrations_provider_check;

ALTER TABLE public.accounting_integrations
  ADD CONSTRAINT accounting_integrations_provider_check
  CHECK (provider = ANY (ARRAY['economic'::text, 'billy'::text, 'dinero'::text, 'zenegy'::text]));
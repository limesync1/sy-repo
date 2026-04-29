-- Sikr at hver virksomhed kun kan have 1 aktiv regnskabsintegration ad gangen
-- (én række pr. business_id total — provider kan ændres ved at opdatere)
DO $$
BEGIN
  -- Drop evt. eksisterende constraint hvis den findes med andet navn
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'accounting_integrations_business_id_provider_key'
  ) THEN
    ALTER TABLE public.accounting_integrations
      DROP CONSTRAINT accounting_integrations_business_id_provider_key;
  END IF;
END $$;

-- Unik på business_id — kun ét regnskabsprogram pr. virksomhed
CREATE UNIQUE INDEX IF NOT EXISTS accounting_integrations_business_id_unique
  ON public.accounting_integrations(business_id);

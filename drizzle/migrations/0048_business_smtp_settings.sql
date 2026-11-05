CREATE TABLE public.business_smtp_settings (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  host text NOT NULL,
  port integer NOT NULL DEFAULT 465,
  username text NOT NULL,
  from_email text NOT NULL,
  from_name text,
  password_ciphertext text NOT NULL,
  password_iv text NOT NULL,
  verified_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Kun serverfunktioner læser/skriver (krypteret adgangskode må aldrig nå browseren).
GRANT ALL ON public.business_smtp_settings TO service_role;
ALTER TABLE public.business_smtp_settings ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.business_smtp_settings IS 'Virksomhedens egen SMTP-konto til kundemails. Kun tilgængelig via business-smtp edge function.';
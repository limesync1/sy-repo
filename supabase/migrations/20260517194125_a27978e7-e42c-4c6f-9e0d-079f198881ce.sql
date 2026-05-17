-- Tabel til 5-cifrede engangs-koder som platform-admin kan bruge til at
-- "logge ind som" en virksomhed (impersonation). Koden er gyldig i 15 min
-- og kan kun bruges én gang.
CREATE TABLE public.admin_impersonation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  business_id uuid NOT NULL,
  admin_user_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_impersonation_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage impersonation codes"
  ON public.admin_impersonation_codes
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_admin_impersonation_codes_code ON public.admin_impersonation_codes (code);
CREATE INDEX idx_admin_impersonation_codes_expires_at ON public.admin_impersonation_codes (expires_at);

-- Generér unik 5-cifret kode og gem den. Kun admins kan kalde funktionen.
CREATE OR REPLACE FUNCTION public.admin_create_impersonation_code(p_business_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_attempts int := 0;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can create impersonation codes';
  END IF;

  -- Forsøg op til 20 gange at finde en ledig kode
  LOOP
    v_code := lpad((floor(random() * 90000) + 10000)::int::text, 5, '0');
    BEGIN
      INSERT INTO public.admin_impersonation_codes (code, business_id, admin_user_id, expires_at)
      VALUES (v_code, p_business_id, auth.uid(), now() + interval '15 minutes');
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      v_attempts := v_attempts + 1;
      IF v_attempts > 20 THEN
        RAISE EXCEPTION 'Could not generate unique code';
      END IF;
    END;
  END LOOP;
END;
$$;

-- Indløs en kode → returnér business_id. Markerer kode som brugt.
CREATE OR REPLACE FUNCTION public.admin_redeem_impersonation_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.admin_impersonation_codes;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can redeem impersonation codes';
  END IF;

  SELECT * INTO v_row
    FROM public.admin_impersonation_codes
    WHERE code = p_code
      AND admin_user_id = auth.uid()
      AND used_at IS NULL
      AND expires_at > now()
    LIMIT 1;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired code';
  END IF;

  UPDATE public.admin_impersonation_codes
    SET used_at = now()
    WHERE id = v_row.id;

  RETURN v_row.business_id;
END;
$$;
CREATE TABLE IF NOT EXISTS public.dpa_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  version text NOT NULL,
  accepted_by uuid NOT NULL,
  accepted_name text,
  accepted_email text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dpa_acceptances_business_idx ON public.dpa_acceptances (business_id, created_at DESC);

GRANT SELECT, INSERT ON public.dpa_acceptances TO authenticated;
GRANT ALL ON public.dpa_acceptances TO service_role;

ALTER TABLE public.dpa_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view their DPA acceptances" ON public.dpa_acceptances;
CREATE POLICY "Owners can view their DPA acceptances"
ON public.dpa_acceptances
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = dpa_acceptances.business_id AND b.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owners can record DPA acceptance" ON public.dpa_acceptances;
CREATE POLICY "Owners can record DPA acceptance"
ON public.dpa_acceptances
FOR INSERT
TO authenticated
WITH CHECK (
  accepted_by = auth.uid()
  AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = dpa_acceptances.business_id AND b.owner_id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.accept_dpa(p_business_id uuid, p_version text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_headers json;
  v_ip text;
  v_ua text;
  v_id uuid;
  v_name text;
  v_email text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Ikke logget ind';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.owner_id = v_uid) THEN
    RAISE EXCEPTION 'Kun virksomhedens ejer kan acceptere databehandleraftalen';
  END IF;

  BEGIN
    v_headers := current_setting('request.headers', true)::json;
  EXCEPTION WHEN others THEN
    v_headers := NULL;
  END;

  IF v_headers IS NOT NULL THEN
    v_ip := split_part(coalesce(v_headers ->> 'cf-connecting-ip', v_headers ->> 'x-forwarded-for', ''), ',', 1);
    v_ua := v_headers ->> 'user-agent';
  END IF;

  SELECT p.display_name INTO v_name FROM public.profiles p WHERE p.user_id = v_uid;
  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = v_uid;

  INSERT INTO public.dpa_acceptances (
    business_id, version, accepted_by, accepted_name, accepted_email, ip_address, user_agent
  ) VALUES (
    p_business_id, p_version, v_uid, v_name, v_email,
    nullif(btrim(coalesce(v_ip, '')), ''), nullif(v_ua, '')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_dpa(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.accept_dpa(uuid, text) TO authenticated;
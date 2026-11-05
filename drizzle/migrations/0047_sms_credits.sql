ALTER TABLE public.business_sms_settings ADD COLUMN IF NOT EXISTS credits integer NOT NULL DEFAULT 0;

CREATE TABLE public.sms_credit_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  stripe_session_id text NOT NULL UNIQUE,
  credits integer NOT NULL,
  amount_dkk numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sms_credit_purchases TO authenticated;
GRANT ALL ON public.sms_credit_purchases TO service_role;
ALTER TABLE public.sms_credit_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read sms purchases" ON public.sms_credit_purchases FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));

-- Ejere må ikke selv ændre kreditter via almindelig opdatering.
CREATE OR REPLACE FUNCTION public._guard_sms_credits() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IN ('authenticated','anon') THEN
    IF TG_OP = 'INSERT' THEN NEW.credits := 0;
    ELSE NEW.credits := OLD.credits; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_guard_sms_credits BEFORE INSERT OR UPDATE ON public.business_sms_settings
FOR EACH ROW EXECUTE FUNCTION public._guard_sms_credits();

CREATE OR REPLACE FUNCTION public.add_sms_credits(p_business uuid, p_session text, p_credits integer, p_amount numeric)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO sms_credit_purchases(business_id, stripe_session_id, credits, amount_dkk)
  VALUES (p_business, p_session, p_credits, p_amount) ON CONFLICT (stripe_session_id) DO NOTHING;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO business_sms_settings(business_id, credits) VALUES (p_business, p_credits)
  ON CONFLICT (business_id) DO UPDATE SET credits = business_sms_settings.credits + EXCLUDED.credits;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.consume_sms_credits(p_business uuid, p_segments integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE business_sms_settings SET credits = credits - p_segments
  WHERE business_id = p_business AND credits >= p_segments;
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.add_sms_credits(uuid,text,integer,numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_sms_credits(uuid,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_sms_credits(uuid,text,integer,numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_sms_credits(uuid,integer) TO service_role;
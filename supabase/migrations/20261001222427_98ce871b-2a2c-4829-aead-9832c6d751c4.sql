ALTER TABLE public.quote_request_matches ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.private_customers(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public._lead_auto_create_customer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  qr record; cid uuid; src text;
BEGIN
  SELECT * INTO qr FROM public.quote_requests WHERE id = NEW.quote_request_id;
  IF qr IS NULL OR qr.share_contact IS NOT TRUE OR coalesce(trim(qr.customer_email),'') = '' THEN RETURN NEW; END IF;
  src := CASE coalesce(qr.source,'serviceydere') WHEN 'facebook' THEN 'Facebook' WHEN 'instagram' THEN 'Instagram' ELSE 'Serviceydere' END;
  INSERT INTO public.private_customers (business_id, name, email, phone, zip_code, city, notes, customer_group)
  VALUES (NEW.business_id, coalesce(nullif(trim(qr.customer_name),''),'Lead'), lower(trim(qr.customer_email)), qr.customer_phone, qr.zip_code, qr.city,
    'Oprettet automatisk fra lead (' || src || coalesce(' · ' || (qr.source_metadata->>'page_name'), '') || ') ' || to_char(coalesce(qr.created_at, now()) AT TIME ZONE 'Europe/Copenhagen', 'DD-MM-YYYY HH24:MI') || E'\nForespørgsel: ' || coalesce(qr.category,''),
    'Lead: ' || src)
  ON CONFLICT (business_id, email) DO NOTHING
  RETURNING id INTO cid;
  IF cid IS NULL THEN
    SELECT id INTO cid FROM public.private_customers WHERE business_id = NEW.business_id AND email = lower(trim(qr.customer_email));
  END IF;
  NEW.customer_id := cid;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_lead_auto_create_customer ON public.quote_request_matches;
CREATE TRIGGER trg_lead_auto_create_customer BEFORE INSERT ON public.quote_request_matches
FOR EACH ROW EXECUTE FUNCTION public._lead_auto_create_customer();
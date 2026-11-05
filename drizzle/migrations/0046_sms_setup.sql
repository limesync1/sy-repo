CREATE TABLE public.business_sms_settings (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  sender_name text,
  monthly_cap integer NOT NULL DEFAULT 200,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.business_sms_settings TO authenticated;
GRANT ALL ON public.business_sms_settings TO service_role;
ALTER TABLE public.business_sms_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage sms settings" ON public.business_sms_settings FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public._validate_sms_settings() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.sender_name IS NOT NULL AND NEW.sender_name !~ '^[A-Za-z0-9]{3,11}$' THEN
    RAISE EXCEPTION 'Afsendernavn skal være 3-11 bogstaver eller tal uden mellemrum';
  END IF;
  IF NEW.monthly_cap < 0 OR NEW.monthly_cap > 10000 THEN
    RAISE EXCEPTION 'Loftet skal være mellem 0 og 10000';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validate_sms_settings BEFORE INSERT OR UPDATE ON public.business_sms_settings
FOR EACH ROW EXECUTE FUNCTION public._validate_sms_settings();

CREATE TABLE public.sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  queue_id uuid,
  kind text NOT NULL DEFAULT 'customer',
  recipient text NOT NULL,
  provider text NOT NULL,
  provider_id text,
  status text NOT NULL,
  segments integer NOT NULL DEFAULT 1,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sms_messages_business_month ON public.sms_messages (business_id, created_at);
GRANT SELECT ON public.sms_messages TO authenticated;
GRANT ALL ON public.sms_messages TO service_role;
ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read sms log" ON public.sms_messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));

UPDATE public.customer_notification_queue SET status='cancelled', last_error='For gammel – sendes ikke'
WHERE channel='sms' AND status='pending' AND send_at < now() - interval '24 hours';
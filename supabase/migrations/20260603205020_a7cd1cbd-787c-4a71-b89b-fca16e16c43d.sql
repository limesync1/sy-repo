
DO $$ BEGIN
  CREATE TYPE public.notification_override_scope AS ENUM ('customer', 'agreement');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_override_channel AS ENUM ('email', 'sms');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.notification_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  scope public.notification_override_scope NOT NULL,
  customer_email text,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  channel public.notification_override_channel NOT NULL,
  enabled boolean,
  lead_time_minutes integer,
  subject text,
  body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notif_override_scope_keys CHECK (
    (scope = 'customer'  AND customer_email IS NOT NULL AND subscription_id IS NULL) OR
    (scope = 'agreement' AND subscription_id IS NOT NULL)
  ),
  CONSTRAINT notif_override_lead_time_range CHECK (lead_time_minutes IS NULL OR (lead_time_minutes >= 0 AND lead_time_minutes <= 20160))
);

CREATE UNIQUE INDEX IF NOT EXISTS notification_overrides_unique
  ON public.notification_overrides (
    business_id, scope,
    COALESCE(lower(customer_email), ''),
    COALESCE(subscription_id, '00000000-0000-0000-0000-000000000000'::uuid),
    event_type, channel
  );

CREATE INDEX IF NOT EXISTS idx_notif_overrides_lookup
  ON public.notification_overrides (business_id, scope, customer_email, subscription_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_overrides TO authenticated;
GRANT ALL ON public.notification_overrides TO service_role;

ALTER TABLE public.notification_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage notification overrides"
  ON public.notification_overrides
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Customers manage their own customer-scope overrides"
  ON public.notification_overrides
  FOR ALL
  USING (
    scope = 'customer'
    AND customer_email IS NOT NULL
    AND lower(customer_email) = lower((auth.jwt() ->> 'email'))
  )
  WITH CHECK (
    scope = 'customer'
    AND customer_email IS NOT NULL
    AND lower(customer_email) = lower((auth.jwt() ->> 'email'))
  );

DROP TRIGGER IF EXISTS update_notification_overrides_updated_at ON public.notification_overrides;
CREATE TRIGGER update_notification_overrides_updated_at
  BEFORE UPDATE ON public.notification_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

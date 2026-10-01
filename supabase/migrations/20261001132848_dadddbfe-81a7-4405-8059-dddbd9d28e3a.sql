ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'serviceydere',
  ADD COLUMN IF NOT EXISTS source_channel text,
  ADD COLUMN IF NOT EXISTS external_lead_id text,
  ADD COLUMN IF NOT EXISTS external_form_id text,
  ADD COLUMN IF NOT EXISTS external_campaign_id text,
  ADD COLUMN IF NOT EXISTS source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS quote_requests_source_external_lead_uidx
  ON public.quote_requests (source, external_lead_id)
  WHERE external_lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS quote_requests_source_created_idx
  ON public.quote_requests (source, created_at DESC);

CREATE TABLE public.meta_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'pending', 'connected', 'expired', 'error')),
  page_id text,
  page_name text,
  instagram_account_id text,
  instagram_account_name text,
  selected_form_ids text[] NOT NULL DEFAULT '{}',
  pixel_id text,
  lead_ads_enabled boolean NOT NULL DEFAULT false,
  conversions_api_enabled boolean NOT NULL DEFAULT false,
  last_synced_at timestamptz,
  last_event_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_connections TO authenticated;
GRANT ALL ON public.meta_connections TO service_role;

ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their Meta connection"
ON public.meta_connections FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = meta_connections.business_id AND b.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Business owners can create their Meta connection"
ON public.meta_connections FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = meta_connections.business_id AND b.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Business owners can update their Meta connection"
ON public.meta_connections FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = meta_connections.business_id AND b.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = meta_connections.business_id AND b.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Business owners can delete their Meta connection"
ON public.meta_connections FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = meta_connections.business_id AND b.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE TRIGGER update_meta_connections_updated_at
BEFORE UPDATE ON public.meta_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX meta_connections_status_idx ON public.meta_connections (status, updated_at DESC);

CREATE TABLE public.meta_conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  event_name text NOT NULL,
  event_source_url text,
  consent_granted boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'skipped', 'failed')),
  error_message text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, event_id)
);

GRANT SELECT ON public.meta_conversion_events TO authenticated;
GRANT ALL ON public.meta_conversion_events TO service_role;

ALTER TABLE public.meta_conversion_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their Meta conversion events"
ON public.meta_conversion_events FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = meta_conversion_events.business_id AND b.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE INDEX meta_conversion_events_business_created_idx
  ON public.meta_conversion_events (business_id, created_at DESC);
CREATE INDEX meta_conversion_events_status_idx
  ON public.meta_conversion_events (status, created_at DESC);
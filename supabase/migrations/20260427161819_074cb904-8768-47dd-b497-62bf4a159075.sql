-- 1) Extend quote_requests with location + privacy fields
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS zip_code text,
  ADD COLUMN IF NOT EXISTS radius_km integer,
  ADD COLUMN IF NOT EXISTS share_contact boolean NOT NULL DEFAULT true;

-- Allow guests/owners to update quote_requests if needed (currently no UPDATE policy)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_requests' AND policyname = 'Admins can update quote requests'
  ) THEN
    CREATE POLICY "Admins can update quote requests"
      ON public.quote_requests
      FOR UPDATE
      TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- 2) New table: per-business matches (the lead view businesses see)
CREATE TABLE IF NOT EXISTS public.quote_request_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  match_score integer NOT NULL DEFAULT 0,
  reason text,
  estimated_price text,
  service_prefills jsonb NOT NULL DEFAULT '[]'::jsonb,
  distance_km numeric,
  status text NOT NULL DEFAULT 'new', -- new | viewed | contacted | declined | won
  business_note text,
  notified_at timestamptz,
  viewed_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quote_request_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_qrm_business_status ON public.quote_request_matches (business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qrm_request ON public.quote_request_matches (quote_request_id);

ALTER TABLE public.quote_request_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners view their leads" ON public.quote_request_matches;
CREATE POLICY "Business owners view their leads"
  ON public.quote_request_matches
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = quote_request_matches.business_id AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Business owners update their leads" ON public.quote_request_matches;
CREATE POLICY "Business owners update their leads"
  ON public.quote_request_matches
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = quote_request_matches.business_id AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = quote_request_matches.business_id AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins manage all leads" ON public.quote_request_matches;
CREATE POLICY "Admins manage all leads"
  ON public.quote_request_matches
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- We do NOT add a public INSERT policy: only the match-quotes edge function (service role) inserts these.

-- Allow business owners to read the parent quote_request for any of their leads
-- (so they can see customer name/email/description on the lead row)
DROP POLICY IF EXISTS "Business owners view requests for their leads" ON public.quote_requests;
CREATE POLICY "Business owners view requests for their leads"
  ON public.quote_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quote_request_matches qrm
      JOIN public.businesses b ON b.id = qrm.business_id
      WHERE qrm.quote_request_id = quote_requests.id AND b.owner_id = auth.uid()
    )
  );

-- updated_at trigger
DROP TRIGGER IF EXISTS quote_request_matches_set_updated_at ON public.quote_request_matches;
CREATE TRIGGER quote_request_matches_set_updated_at
  BEFORE UPDATE ON public.quote_request_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
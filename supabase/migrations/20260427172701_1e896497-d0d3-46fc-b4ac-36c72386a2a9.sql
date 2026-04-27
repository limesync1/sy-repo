ALTER TABLE public.quote_request_matches
  ADD COLUMN IF NOT EXISTS follow_up_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS ai_draft text,
  ADD COLUMN IF NOT EXISTS ai_draft_generated_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_qrm_business_status_created
  ON public.quote_request_matches (business_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_qrm_follow_up
  ON public.quote_request_matches (business_id, follow_up_at)
  WHERE follow_up_at IS NOT NULL;
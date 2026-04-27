-- Prevent duplicate leads for same (request, business)
CREATE UNIQUE INDEX IF NOT EXISTS quote_request_matches_unique_pair
  ON public.quote_request_matches (quote_request_id, business_id);

-- Track customer consent for sharing data with matched businesses
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp with time zone;
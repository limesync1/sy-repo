
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS flagged_reason TEXT,
  ADD COLUMN IF NOT EXISTS flagged_by UUID,
  ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hidden_by UUID,
  ADD COLUMN IF NOT EXISTS admin_note TEXT;

CREATE INDEX IF NOT EXISTS idx_reviews_flagged_at ON public.reviews (flagged_at) WHERE flagged_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_hidden_at ON public.reviews (hidden_at) WHERE hidden_at IS NOT NULL;

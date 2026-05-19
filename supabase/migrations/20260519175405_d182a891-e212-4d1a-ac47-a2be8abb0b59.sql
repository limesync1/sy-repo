ALTER TABLE public.business_deletion_codes
  ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMPTZ;

UPDATE public.business_deletion_codes
   SET redeemed_at = consumed_at
 WHERE redeemed_at IS NULL AND consumed_at IS NOT NULL;

ALTER TABLE public.business_deletion_codes
  DROP COLUMN IF EXISTS consumed_at;

ALTER TABLE public.business_deletion_codes
  ADD COLUMN IF NOT EXISTS requested_by_user_id UUID;

ALTER TABLE public.business_deletion_codes
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '15 minutes');
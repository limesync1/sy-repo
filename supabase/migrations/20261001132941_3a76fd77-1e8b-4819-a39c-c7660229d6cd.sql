ALTER TABLE public.meta_connections
  ADD COLUMN IF NOT EXISTS access_token_ciphertext text,
  ADD COLUMN IF NOT EXISTS access_token_iv text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;

REVOKE SELECT ON public.meta_connections FROM authenticated;
GRANT SELECT (
  id, business_id, status, page_id, page_name, instagram_account_id,
  instagram_account_name, selected_form_ids, pixel_id, lead_ads_enabled,
  conversions_api_enabled, last_synced_at, last_event_at, last_error,
  token_expires_at, created_at, updated_at
) ON public.meta_connections TO authenticated;
GRANT INSERT (
  business_id, status, page_id, page_name, instagram_account_id,
  instagram_account_name, selected_form_ids, pixel_id, lead_ads_enabled,
  conversions_api_enabled
) ON public.meta_connections TO authenticated;
GRANT UPDATE (
  status, page_id, page_name, instagram_account_id, instagram_account_name,
  selected_form_ids, pixel_id, lead_ads_enabled, conversions_api_enabled
) ON public.meta_connections TO authenticated;
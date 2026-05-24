
-- ============================================================
-- Security hardening migration
-- ============================================================

-- 1) accounting_integrations: hide live API credentials from
--    PostgREST SELECT. Owners can still update/insert, and
--    server-side edge functions (service role) keep full access.
REVOKE SELECT (api_token, api_secret) ON public.accounting_integrations FROM anon, authenticated;

-- 2) businesses: stop leaking internal notification config to
--    anonymous visitors browsing public business pages.
REVOKE SELECT (notification_settings, settings) ON public.businesses FROM anon;

-- 3) chat_conversations: keep widget working but stop leaking
--    visitor PII and session tokens to anonymous clients.
REVOKE SELECT (visitor_email, session_token, user_id, visitor_name)
  ON public.chat_conversations FROM anon;

-- 4) quotes: tighten "viewable by relevant parties" so a logged-in
--    user can only see quotes for requests they actually submitted
--    (or that target their own business).
DROP POLICY IF EXISTS "Quotes are viewable by relevant parties" ON public.quotes;

CREATE POLICY "Quotes are viewable by relevant parties"
ON public.quotes
FOR SELECT
TO authenticated
USING (
  -- The business that issued the quote
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = quotes.business_id AND b.owner_id = auth.uid()
  )
  OR
  -- The customer who originally submitted the request
  EXISTS (
    SELECT 1 FROM public.quote_requests qr
    WHERE qr.id = quotes.quote_request_id
      AND lower(qr.customer_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  )
);

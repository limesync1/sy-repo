
-- 1. Accounting integration secrets — revoke from client roles
REVOKE SELECT (api_token, api_secret) ON public.accounting_integrations FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_accounting_integration_secret_meta(p_business_id uuid)
RETURNS TABLE(api_token_last4 text, api_secret_last4 text, has_token boolean, has_secret boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    RIGHT(api_token, 4),
    RIGHT(api_secret, 4),
    (api_token IS NOT NULL AND length(api_token) > 0),
    (api_secret IS NOT NULL AND length(api_secret) > 0)
  FROM public.accounting_integrations
  WHERE business_id = p_business_id
    AND (
      EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.owner_id = auth.uid())
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_accounting_integration_secret_meta(uuid) TO authenticated;

-- 2. Businesses — hide sensitive jsonb columns from anonymous visitors
REVOKE SELECT (settings, notification_settings) ON public.businesses FROM anon;

-- 3. Chat conversations — hide visitor PII from anonymous users; provide secure lookup
REVOKE SELECT (visitor_email, visitor_name, session_token, user_id) ON public.chat_conversations FROM anon;

CREATE OR REPLACE FUNCTION public.get_chat_conversation_by_token(p_token text)
RETURNS TABLE(id uuid, session_token text, visitor_name text, visitor_email text, subject text, status text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.session_token, c.visitor_name, c.visitor_email, c.subject, c.status
  FROM public.chat_conversations c
  WHERE c.session_token = p_token
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_chat_conversation_by_token(text) TO anon, authenticated;

-- 4. Quote requests — revoke direct read of contact details; expose via RPC respecting share_contact
REVOKE SELECT (customer_email, customer_phone) ON public.quote_requests FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_quote_request_contact(p_quote_request_id uuid)
RETURNS TABLE(customer_email text, customer_phone text, customer_name text, share_contact boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE WHEN qr.share_contact THEN qr.customer_email ELSE NULL END,
    CASE WHEN qr.share_contact THEN qr.customer_phone ELSE NULL END,
    qr.customer_name,
    qr.share_contact
  FROM public.quote_requests qr
  WHERE qr.id = p_quote_request_id
    AND (
      EXISTS (
        SELECT 1
        FROM public.quote_request_matches qrm
        JOIN public.businesses b ON b.id = qrm.business_id
        WHERE qrm.quote_request_id = qr.id
          AND b.owner_id = auth.uid()
      )
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    );
$$;
GRANT EXECUTE ON FUNCTION public.get_quote_request_contact(uuid) TO authenticated;

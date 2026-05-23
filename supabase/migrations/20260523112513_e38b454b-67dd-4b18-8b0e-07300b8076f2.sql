
-- ============ profiles ============
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Public-safe view for testimonials / public displays.
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT user_id, display_name, avatar_url
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Allow the view to read profiles via a permissive policy scoped to safe columns only.
-- Since RLS applies, add a permissive SELECT policy that is restricted to the view by
-- granting SELECT on view; the view runs as invoker so we need to allow base reads for
-- the safe columns. Use a column-agnostic policy that allows anon to read base rows
-- ONLY through the view by adding a policy that returns true. To avoid leaking phone,
-- we instead use security_invoker=false so the view runs as owner:
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT user_id, display_name, avatar_url
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- ============ quote_requests ============
DROP POLICY IF EXISTS "Quote requests are viewable by everyone" ON public.quote_requests;

-- ============ order_group_has_active_approval_token: fix logic ============
CREATE OR REPLACE FUNCTION public.order_group_has_active_approval_token(_parent_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders parent
    WHERE parent.id = _parent_order_id
      AND parent.approval_token IS NOT NULL
      AND parent.requires_customer_approval = true
      AND (parent.approval_expires_at IS NULL OR parent.approval_expires_at > now())
  )
$function$;

-- ============ chat-attachments storage bucket ============
DROP POLICY IF EXISTS "Anyone can read chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update own chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload chat attachments" ON storage.objects;

-- Uploads: first path segment must be an existing chat_conversations.id (UUID).
CREATE POLICY "Chat attachments uploads scoped to conversation"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id::text = (storage.foldername(name))[1]
  )
);

-- Updates/overwrites: only authenticated business owners/livechat employees/admins for that conversation.
CREATE POLICY "Chat attachments update restricted to staff"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.chat_conversations c
      JOIN public.businesses b ON b.id = c.business_id
      WHERE c.id::text = (storage.foldername(objects.name))[1]
        AND b.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.chat_conversations c
      JOIN public.employees e ON e.business_id = c.business_id
      WHERE c.id::text = (storage.foldername(objects.name))[1]
        AND e.user_id = auth.uid()
        AND e.livechat_enabled = true
    )
  )
);

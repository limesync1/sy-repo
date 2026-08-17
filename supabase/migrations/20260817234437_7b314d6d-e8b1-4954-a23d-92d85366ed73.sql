
-- 1. Remove the fully public read/insert policies on chat_messages
DROP POLICY IF EXISTS "Anyone can view chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON public.chat_messages;

-- 2. Signed-in visitors may read/write messages in their own conversations
CREATE POLICY "Conversation owners view their messages"
ON public.chat_messages FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.chat_conversations c
  WHERE c.id = chat_messages.conversation_id AND c.user_id = auth.uid()
));

CREATE POLICY "Conversation owners insert visitor messages"
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_type = 'visitor'
  AND EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id AND c.user_id = auth.uid()
  )
);

-- 3. Token-based access for anonymous visitors
CREATE OR REPLACE FUNCTION public.get_chat_messages_by_token(p_token text)
RETURNS TABLE(
  id uuid, conversation_id uuid, sender_type text, sender_name text,
  content text, image_url text, is_system boolean, metadata jsonb, created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT m.id, m.conversation_id, m.sender_type, m.sender_name,
         m.content, m.image_url, m.is_system, m.metadata, m.created_at
  FROM public.chat_messages m
  JOIN public.chat_conversations c ON c.id = m.conversation_id
  WHERE c.session_token = p_token
    AND length(coalesce(p_token, '')) >= 32
  ORDER BY m.created_at ASC
  LIMIT 500;
$$;

CREATE OR REPLACE FUNCTION public.send_chat_message_by_token(
  p_token text,
  p_content text DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_is_system boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conv public.chat_conversations%ROWTYPE;
  v_id uuid;
  v_content text;
BEGIN
  IF length(coalesce(p_token, '')) < 32 THEN
    RAISE EXCEPTION 'Ugyldig sessions-token';
  END IF;

  SELECT * INTO v_conv FROM public.chat_conversations WHERE session_token = p_token LIMIT 1;
  IF v_conv.id IS NULL THEN
    RAISE EXCEPTION 'Samtalen findes ikke';
  END IF;

  v_content := nullif(left(coalesce(p_content, ''), 2000), '');
  IF v_content IS NULL AND p_image_url IS NULL THEN
    RAISE EXCEPTION 'Tom besked';
  END IF;

  IF v_conv.status = 'closed' AND coalesce(p_is_system, false) = false THEN
    RAISE EXCEPTION 'Samtalen er lukket';
  END IF;

  INSERT INTO public.chat_messages (conversation_id, sender_type, sender_name, content, image_url, is_system)
  VALUES (v_conv.id, 'visitor', v_conv.visitor_name, v_content, p_image_url, coalesce(p_is_system, false))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_chat_conversation_by_token(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF length(coalesce(p_token, '')) < 32 THEN
    RAISE EXCEPTION 'Ugyldig sessions-token';
  END IF;
  UPDATE public.chat_conversations
     SET status = 'closed'
   WHERE session_token = p_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_chat_read_by_token(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF length(coalesce(p_token, '')) < 32 THEN
    RETURN;
  END IF;
  UPDATE public.chat_conversations
     SET unread_visitor_count = 0
   WHERE session_token = p_token;
END;
$$;

REVOKE ALL ON FUNCTION public.get_chat_messages_by_token(text) FROM public;
REVOKE ALL ON FUNCTION public.send_chat_message_by_token(text, text, text, boolean) FROM public;
REVOKE ALL ON FUNCTION public.close_chat_conversation_by_token(text) FROM public;
REVOKE ALL ON FUNCTION public.mark_chat_read_by_token(text) FROM public;

GRANT EXECUTE ON FUNCTION public.get_chat_messages_by_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.send_chat_message_by_token(text, text, text, boolean) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.close_chat_conversation_by_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_chat_read_by_token(text) TO anon, authenticated, service_role;

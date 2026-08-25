CREATE OR REPLACE FUNCTION public.chat_conversation_exists(_folder text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id::text = _folder
  );
$$;

GRANT EXECUTE ON FUNCTION public.chat_conversation_exists(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Chat attachments uploads scoped to conversation" ON storage.objects;
CREATE POLICY "Chat attachments uploads scoped to conversation"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND public.chat_conversation_exists((storage.foldername(name))[1])
);
-- Add business_id to chat_conversations so virksomheder kan have deres egen livechat
ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_chat_conversations_business_id
  ON public.chat_conversations(business_id);

-- Tillad virksomhedsejere at administrere chats hvor business_id = deres virksomhed
CREATE POLICY "Business owners manage their chat conversations"
ON public.chat_conversations
FOR ALL
TO authenticated
USING (
  business_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = chat_conversations.business_id
      AND b.owner_id = auth.uid()
  )
)
WITH CHECK (
  business_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = chat_conversations.business_id
      AND b.owner_id = auth.uid()
  )
);

-- Tillad virksomhedsejere at administrere beskeder for deres egne chats
CREATE POLICY "Business owners manage messages in their chats"
ON public.chat_messages
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations c
    JOIN public.businesses b ON b.id = c.business_id
    WHERE c.id = chat_messages.conversation_id
      AND b.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_conversations c
    JOIN public.businesses b ON b.id = c.business_id
    WHERE c.id = chat_messages.conversation_id
      AND b.owner_id = auth.uid()
  )
);
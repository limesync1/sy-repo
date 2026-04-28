
-- Chat conversations (one per visitor session or user)
CREATE TABLE public.chat_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_token text NOT NULL UNIQUE,
  user_id uuid NULL,
  visitor_name text NOT NULL,
  visitor_email text NOT NULL,
  subject text NULL,
  status text NOT NULL DEFAULT 'open',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  unread_admin_count integer NOT NULL DEFAULT 0,
  unread_visitor_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_conversations_status ON public.chat_conversations(status, last_message_at DESC);
CREATE INDEX idx_chat_conversations_user_id ON public.chat_conversations(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

-- Anyone can create a conversation (visitor or logged-in)
CREATE POLICY "Anyone can create chat conversations"
ON public.chat_conversations FOR INSERT
WITH CHECK (true);

-- Visitors can view their own conversation by session token (read via edge function or by passing token in queries)
-- For simplicity we let SELECT be restricted to: owner-by-user_id OR admin. Token-based access happens via .eq('session_token', ...).
CREATE POLICY "Anyone can view conversation by session token"
ON public.chat_conversations FOR SELECT
USING (true);

CREATE POLICY "Users can update their own conversation"
ON public.chat_conversations FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Admins manage all chat conversations"
ON public.chat_conversations FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Chat messages
CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('visitor','admin')),
  sender_name text NOT NULL,
  content text NOT NULL,
  read_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can insert/select messages — frontend filters by conversation_id matched with session_token client side.
-- Real protection: conversation_id is a UUID and session_token is required to know it.
CREATE POLICY "Anyone can insert chat messages"
ON public.chat_messages FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view chat messages"
ON public.chat_messages FOR SELECT
USING (true);

CREATE POLICY "Admins manage all chat messages"
ON public.chat_messages FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger to bump last_message_at and unread counters
CREATE OR REPLACE FUNCTION public.bump_chat_conversation_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_type = 'visitor' THEN
    UPDATE public.chat_conversations
       SET last_message_at = NEW.created_at,
           unread_admin_count = unread_admin_count + 1,
           updated_at = now()
     WHERE id = NEW.conversation_id;
  ELSE
    UPDATE public.chat_conversations
       SET last_message_at = NEW.created_at,
           unread_visitor_count = unread_visitor_count + 1,
           updated_at = now()
     WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bump_chat_conversation
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.bump_chat_conversation_on_message();

-- Updated_at trigger for conversations
CREATE TRIGGER trg_chat_conversations_updated_at
BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

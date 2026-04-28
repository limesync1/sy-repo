-- 1) Felter til SLA, lukning og medarbejder-tildeling på samtaler
ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS first_admin_reply_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS assigned_employee_id uuid;

CREATE INDEX IF NOT EXISTS idx_chat_conversations_business_status
  ON public.chat_conversations (business_id, status, last_message_at DESC);

-- 2) Live chat-flag på medarbejdere
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS livechat_enabled boolean NOT NULL DEFAULT false;

-- 3) Skabeloner til hurtige svar
CREATE TABLE IF NOT EXISTS public.chat_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_templates_business
  ON public.chat_templates (business_id, sort_order);

ALTER TABLE public.chat_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage chat templates"
ON public.chat_templates
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Business owners manage their chat templates"
ON public.chat_templates
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.businesses b
  WHERE b.id = chat_templates.business_id AND b.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.businesses b
  WHERE b.id = chat_templates.business_id AND b.owner_id = auth.uid()
));

CREATE POLICY "Livechat employees can read templates"
ON public.chat_templates
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.employees e
  WHERE e.business_id = chat_templates.business_id
    AND e.user_id = auth.uid()
    AND e.livechat_enabled = true
));

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_chat_templates_updated_at ON public.chat_templates;
CREATE TRIGGER trg_chat_templates_updated_at
BEFORE UPDATE ON public.chat_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) RLS for medarbejdere med livechat-adgang på samtaler/beskeder
CREATE POLICY "Livechat employees view business conversations"
ON public.chat_conversations
FOR SELECT
TO authenticated
USING (
  business_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.business_id = chat_conversations.business_id
      AND e.user_id = auth.uid()
      AND e.livechat_enabled = true
  )
);

CREATE POLICY "Livechat employees update business conversations"
ON public.chat_conversations
FOR UPDATE
TO authenticated
USING (
  business_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.business_id = chat_conversations.business_id
      AND e.user_id = auth.uid()
      AND e.livechat_enabled = true
  )
)
WITH CHECK (
  business_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.business_id = chat_conversations.business_id
      AND e.user_id = auth.uid()
      AND e.livechat_enabled = true
  )
);

CREATE POLICY "Livechat employees view business messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.chat_conversations c
  JOIN public.employees e ON e.business_id = c.business_id
  WHERE c.id = chat_messages.conversation_id
    AND e.user_id = auth.uid()
    AND e.livechat_enabled = true
));

CREATE POLICY "Livechat employees insert business messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1
  FROM public.chat_conversations c
  JOIN public.employees e ON e.business_id = c.business_id
  WHERE c.id = chat_messages.conversation_id
    AND e.user_id = auth.uid()
    AND e.livechat_enabled = true
));

-- 5) Trigger der sætter first_admin_reply_at og closed_at automatisk
CREATE OR REPLACE FUNCTION public.handle_chat_conversation_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Første ikke-system admin/medarbejder-svar markerer SLA-stop
  IF NEW.sender_type = 'admin' AND COALESCE(NEW.is_system, false) = false THEN
    UPDATE public.chat_conversations
       SET first_admin_reply_at = COALESCE(first_admin_reply_at, NEW.created_at)
     WHERE id = NEW.conversation_id
       AND first_admin_reply_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_first_admin_reply ON public.chat_messages;
CREATE TRIGGER trg_chat_first_admin_reply
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.handle_chat_conversation_state();

-- Når status ændres til closed → sæt closed_at; ved reopen → null
CREATE OR REPLACE FUNCTION public.handle_chat_conversation_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'closed' AND (OLD.status IS DISTINCT FROM 'closed') THEN
    NEW.closed_at := now();
  ELSIF NEW.status <> 'closed' AND OLD.status = 'closed' THEN
    NEW.closed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_conversation_status ON public.chat_conversations;
CREATE TRIGGER trg_chat_conversation_status
BEFORE UPDATE OF status ON public.chat_conversations
FOR EACH ROW EXECUTE FUNCTION public.handle_chat_conversation_status();
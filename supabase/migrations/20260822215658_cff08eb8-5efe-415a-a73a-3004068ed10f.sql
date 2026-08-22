CREATE TABLE public.ai_link_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'livechat-ai-reply',
  conversation_id uuid,
  message_id uuid,
  raw_link text NOT NULL,
  resolved_link text,
  kind text NOT NULL,
  link_label text,
  reply_excerpt text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ai_link_issues TO service_role;
ALTER TABLE public.ai_link_issues ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.chat_message_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  message_id uuid NOT NULL,
  rating text NOT NULL CHECK (rating IN ('up','down')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id)
);
GRANT ALL ON public.chat_message_feedback TO service_role;
ALTER TABLE public.chat_message_feedback ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ai_link_issues_created ON public.ai_link_issues (created_at DESC);
CREATE INDEX idx_chat_message_feedback_created ON public.chat_message_feedback (created_at DESC);
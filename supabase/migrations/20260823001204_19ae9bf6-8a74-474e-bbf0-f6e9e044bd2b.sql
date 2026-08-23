-- 1) Status på link-fejl
ALTER TABLE public.ai_link_issues
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS admin_note text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by uuid;

ALTER TABLE public.ai_link_issues ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE, DELETE ON public.ai_link_issues TO authenticated;
GRANT ALL ON public.ai_link_issues TO service_role;
DROP POLICY IF EXISTS "Admins manage ai link issues" ON public.ai_link_issues;
CREATE POLICY "Admins manage ai link issues" ON public.ai_link_issues
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) Godkendte alias-rettelser
CREATE TABLE IF NOT EXISTS public.ai_link_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wrong_path text NOT NULL UNIQUE,
  correct_path text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_link_aliases TO authenticated;
GRANT ALL ON public.ai_link_aliases TO service_role;
ALTER TABLE public.ai_link_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage ai link aliases" ON public.ai_link_aliases;
CREATE POLICY "Admins manage ai link aliases" ON public.ai_link_aliases
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) Review-tickets fra "Rapportér forkert svar"
CREATE TABLE IF NOT EXISTS public.ai_review_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid,
  message_id uuid,
  source text NOT NULL DEFAULT 'livechat',
  reported_reason text,
  answer_excerpt text,
  question_excerpt text,
  categories text[] NOT NULL DEFAULT '{}',
  suggested_fix text,
  suggested_title text,
  status text NOT NULL DEFAULT 'open',
  admin_note text,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_review_tickets TO authenticated;
GRANT ALL ON public.ai_review_tickets TO service_role;
ALTER TABLE public.ai_review_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage ai review tickets" ON public.ai_review_tickets;
CREATE POLICY "Admins manage ai review tickets" ON public.ai_review_tickets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) Måling pr. AI-svar
CREATE TABLE IF NOT EXISTS public.ai_answer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid,
  message_id uuid,
  source text NOT NULL DEFAULT 'livechat',
  categories text[] NOT NULL DEFAULT '{}',
  link_issue_count integer NOT NULL DEFAULT 0,
  alias_fix_count integer NOT NULL DEFAULT 0,
  invalid_link_count integer NOT NULL DEFAULT 0,
  escalated boolean NOT NULL DEFAULT false,
  sound_played integer NOT NULL DEFAULT 0,
  sound_deduped integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_answer_events_created_idx ON public.ai_answer_events (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ai_answer_events_message_idx ON public.ai_answer_events (message_id);
GRANT SELECT, UPDATE ON public.ai_answer_events TO authenticated;
GRANT ALL ON public.ai_answer_events TO service_role;
ALTER TABLE public.ai_answer_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read ai answer events" ON public.ai_answer_events;
CREATE POLICY "Admins read ai answer events" ON public.ai_answer_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS ai_link_issues_status_idx ON public.ai_link_issues (status, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_review_tickets_status_idx ON public.ai_review_tickets (status, created_at DESC);
CREATE TABLE public.seo_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled boolean NOT NULL DEFAULT false,
  auto_publish boolean NOT NULL DEFAULT false,
  articles_per_week int NOT NULL DEFAULT 3 CHECK (articles_per_week BETWEEN 0 AND 7),
  paused_reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.seo_settings(id) VALUES (true);

CREATE TABLE public.seo_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  kind text NOT NULL DEFAULT 'new' CHECK (kind IN ('new','refresh')),
  source text NOT NULL DEFAULT 'gsc',
  target_path text,
  impressions int NOT NULL DEFAULT 0,
  clicks int NOT NULL DEFAULT 0,
  position numeric,
  score numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','writing','written','rejected','done')),
  suggestion jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, keyword)
);

CREATE TABLE public.seo_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid REFERENCES public.seo_topics(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'Ruteplanlægning',
  keywords text NOT NULL DEFAULT '',
  sections jsonb NOT NULL DEFAULT '[]',
  faq jsonb NOT NULL DEFAULT '[]',
  reading_minutes int NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','rejected')),
  published_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  index_status text,
  index_checked_at timestamptz,
  needs_improvement boolean NOT NULL DEFAULT false
);

CREATE TABLE public.seo_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  run_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'running',
  details jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

GRANT SELECT, UPDATE ON public.seo_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_topics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_articles TO authenticated;
GRANT SELECT ON public.seo_articles TO anon;
GRANT SELECT ON public.seo_runs TO authenticated;
GRANT ALL ON public.seo_settings, public.seo_topics, public.seo_articles, public.seo_runs TO service_role;

ALTER TABLE public.seo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage seo settings" ON public.seo_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage seo topics" ON public.seo_topics FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage seo articles" ON public.seo_articles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Public reads published articles" ON public.seo_articles FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "Admins read seo runs" ON public.seo_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
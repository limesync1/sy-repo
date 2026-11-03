CREATE TABLE public.article_images (
  path text PRIMARY KEY,
  title text NOT NULL,
  topic text,
  status text NOT NULL DEFAULT 'pending',
  image_url text,
  alt text,
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.article_images TO anon, authenticated;
GRANT ALL ON public.article_images TO service_role;
ALTER TABLE public.article_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read finished article images" ON public.article_images FOR SELECT TO anon, authenticated USING (status = 'done');
CREATE INDEX article_images_pending_idx ON public.article_images (status, created_at);

CREATE TABLE public.article_image_job (
  id int PRIMARY KEY DEFAULT 1,
  paused_reason text,
  lease_until timestamptz,
  CHECK (id = 1)
);
INSERT INTO public.article_image_job (id) VALUES (1);
GRANT ALL ON public.article_image_job TO service_role;
ALTER TABLE public.article_image_job ENABLE ROW LEVEL SECURITY;
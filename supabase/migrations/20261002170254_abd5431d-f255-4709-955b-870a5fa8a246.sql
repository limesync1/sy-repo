CREATE TABLE public.onboarding_videos (
  step_id text PRIMARY KEY,
  video_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.onboarding_videos TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.onboarding_videos TO authenticated;
GRANT ALL ON public.onboarding_videos TO service_role;
ALTER TABLE public.onboarding_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Logged in users can read onboarding videos" ON public.onboarding_videos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage onboarding videos" ON public.onboarding_videos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
ALTER TABLE public.seo_settings DROP CONSTRAINT IF EXISTS seo_settings_articles_per_week_check;
ALTER TABLE public.seo_settings ADD CONSTRAINT seo_settings_articles_per_week_check CHECK (articles_per_week BETWEEN 0 AND 28);
UPDATE public.seo_settings SET articles_per_week = 21;
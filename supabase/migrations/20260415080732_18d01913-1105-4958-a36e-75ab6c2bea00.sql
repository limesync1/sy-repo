ALTER TABLE public.profiles
ADD COLUMN notification_settings jsonb NOT NULL DEFAULT '{}'::jsonb;
-- Add image_url column for image attachments in chat messages
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Allow content to be optional when an image is attached
ALTER TABLE public.chat_messages
ALTER COLUMN content DROP NOT NULL;

-- Create public bucket for chat attachments (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  true,
  5242880, -- 5 MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

-- RLS policies for the bucket
DROP POLICY IF EXISTS "Anyone can read chat attachments" ON storage.objects;
CREATE POLICY "Anyone can read chat attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "Anyone can upload chat attachments" ON storage.objects;
CREATE POLICY "Anyone can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "Anyone can update own chat attachments" ON storage.objects;
CREATE POLICY "Anyone can update own chat attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'chat-attachments');
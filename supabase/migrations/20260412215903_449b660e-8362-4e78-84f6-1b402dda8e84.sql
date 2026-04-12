
-- Create public storage bucket for business assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-assets', 'business-assets', true);

-- Allow public read access to all files
CREATE POLICY "Business assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-assets');

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-assets' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-assets' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-assets' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

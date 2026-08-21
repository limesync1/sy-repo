DROP POLICY IF EXISTS "Authenticated users upload owned business assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;

CREATE POLICY "Signed in users can upload business assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-assets'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Signed in users can upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

CREATE POLICY "Users update avatars they own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND owner_id = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND owner_id = auth.uid()::text
);

CREATE POLICY "Users delete avatars they own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND owner_id = auth.uid()::text
);
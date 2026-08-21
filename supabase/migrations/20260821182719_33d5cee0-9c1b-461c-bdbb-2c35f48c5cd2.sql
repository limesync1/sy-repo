DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

CREATE POLICY "Authenticated users upload owned business assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-assets'
  AND owner_id = (SELECT auth.uid()::text)
);

CREATE POLICY "Authenticated users update owned business assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-assets'
  AND owner_id = (SELECT auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'business-assets'
  AND owner_id = (SELECT auth.uid()::text)
);

CREATE POLICY "Authenticated users delete owned business assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-assets'
  AND owner_id = (SELECT auth.uid()::text)
);
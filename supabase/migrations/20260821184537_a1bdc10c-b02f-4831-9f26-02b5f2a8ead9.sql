GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated;
GRANT ALL ON storage.objects TO service_role;
GRANT SELECT ON storage.buckets TO anon, authenticated;
GRANT ALL ON storage.buckets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.s3_multipart_uploads TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.s3_multipart_uploads_parts TO anon, authenticated;
GRANT ALL ON storage.s3_multipart_uploads TO service_role;
GRANT ALL ON storage.s3_multipart_uploads_parts TO service_role;
GRANT ALL ON storage.objects TO anon, authenticated, service_role;
GRANT ALL ON storage.buckets TO anon, authenticated, service_role;
GRANT ALL ON storage.migrations TO service_role;
GRANT SELECT ON storage.migrations TO anon, authenticated;
GRANT ALL ON storage.s3_multipart_uploads TO anon, authenticated, service_role;
GRANT ALL ON storage.s3_multipart_uploads_parts TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
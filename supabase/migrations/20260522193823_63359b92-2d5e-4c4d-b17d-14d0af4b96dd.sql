
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, user_id, display_name, avatar_url, created_at, updated_at) ON public.profiles TO anon;

DROP POLICY IF EXISTS "Anyone can create reviews" ON public.reviews;
CREATE POLICY "Authenticated users can create reviews"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
CREATE POLICY "Order items insert scoped to order owner"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (
          is_business_owner(o.business_id, auth.uid())
          OR (auth.uid() IS NOT NULL AND o.customer_id = auth.uid())
          OR (auth.uid() IS NULL AND o.customer_id IS NULL)
          OR has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );

DROP POLICY IF EXISTS "Owners manage their customer document files" ON storage.objects;
CREATE POLICY "Owners manage their customer document files"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'customer-documents'
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id::text = (storage.foldername(storage.objects.name))[1]
        AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'customer-documents'
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id::text = (storage.foldername(storage.objects.name))[1]
        AND b.owner_id = auth.uid()
    )
  );

ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;

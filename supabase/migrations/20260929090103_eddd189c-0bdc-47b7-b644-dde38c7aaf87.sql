-- reviews
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.reviews;
CREATE POLICY "Customers can create their own reviews" ON public.reviews
FOR INSERT TO authenticated
WITH CHECK (
  customer_id = auth.uid()
  AND coalesce(is_verified, false) = false
  AND flagged_at IS NULL AND flagged_by IS NULL AND flagged_reason IS NULL
  AND hidden_at IS NULL AND hidden_by IS NULL AND admin_note IS NULL
  AND rating BETWEEN 1 AND 5
  AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = reviews.business_id AND b.is_active = true AND b.deleted_at IS NULL)
);

DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
CREATE POLICY "Visible reviews are viewable by everyone" ON public.reviews
FOR SELECT
USING (hidden_at IS NULL OR (auth.uid() IS NOT NULL AND customer_id = auth.uid()));

-- business_slug_history
DROP POLICY IF EXISTS "Slug history viewable by everyone" ON public.business_slug_history;
CREATE POLICY "Slug history of active businesses is viewable" ON public.business_slug_history
FOR SELECT
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_slug_history.business_id AND b.is_active = true AND b.deleted_at IS NULL)
  OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_slug_history.business_id AND b.owner_id = auth.uid()));

-- calculator_steps
DROP POLICY IF EXISTS "Calculator steps viewable by everyone" ON public.calculator_steps;
CREATE POLICY "Calculator steps of active services are viewable" ON public.calculator_steps
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.services s JOIN public.businesses b ON b.id = s.business_id
  WHERE s.id = calculator_steps.service_id AND s.is_active = true AND b.is_active = true AND b.deleted_at IS NULL
));

-- quote_requests
DROP POLICY IF EXISTS "Anyone can create quote requests" ON public.quote_requests;
CREATE POLICY "Anyone can submit valid quote requests" ON public.quote_requests
FOR INSERT
WITH CHECK (
  status = 'open'
  AND length(btrim(customer_name)) BETWEEN 1 AND 200
  AND length(btrim(customer_email)) BETWEEN 3 AND 320
  AND customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND (customer_phone IS NULL OR length(customer_phone) <= 40)
  AND length(btrim(category)) BETWEEN 1 AND 200
  AND length(btrim(description)) BETWEEN 1 AND 5000
  AND (city IS NULL OR length(city) <= 200)
  AND (zip_code IS NULL OR length(zip_code) <= 20)
  AND (radius_km IS NULL OR radius_km BETWEEN 0 AND 1000)
);

-- chat_conversations
DROP POLICY IF EXISTS "Anyone can create chat conversations" ON public.chat_conversations;
CREATE POLICY "Visitors can start valid chat conversations" ON public.chat_conversations
FOR INSERT
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND status = 'open'
  AND unread_admin_count = 0 AND unread_visitor_count = 0
  AND assigned_employee_id IS NULL
  AND first_admin_reply_at IS NULL AND closed_at IS NULL
  AND needs_human = false
  AND length(session_token) >= 32
  AND length(btrim(visitor_name)) BETWEEN 1 AND 200
  AND length(btrim(visitor_email)) BETWEEN 3 AND 320
  AND (subject IS NULL OR length(subject) <= 500)
  AND (business_id IS NULL OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = chat_conversations.business_id AND b.is_active = true AND b.deleted_at IS NULL))
);
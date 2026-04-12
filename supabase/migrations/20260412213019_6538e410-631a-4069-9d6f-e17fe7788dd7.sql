
-- Add category to businesses
ALTER TABLE public.businesses ADD COLUMN category text;

-- Create quote_requests table
CREATE TABLE public.quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  category text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can create quote requests
CREATE POLICY "Anyone can create quote requests"
ON public.quote_requests FOR INSERT
WITH CHECK (true);

-- Anyone can view quote requests (businesses need to see them to respond)
CREATE POLICY "Quote requests are viewable by everyone"
ON public.quote_requests FOR SELECT
USING (true);

-- Create quotes table
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  price numeric NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Business owners can create quotes
CREATE POLICY "Business owners can create quotes"
ON public.quotes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = quotes.business_id
    AND businesses.owner_id = auth.uid()
  )
);

-- Quotes viewable by business owner and by matching customer email
CREATE POLICY "Quotes are viewable by relevant parties"
ON public.quotes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = quotes.business_id
    AND businesses.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.quote_requests
    WHERE quote_requests.id = quotes.quote_request_id
  )
);

-- Enable realtime for quote_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.quote_requests;

-- Add trigger for updated_at on quote_requests
CREATE TRIGGER update_quote_requests_updated_at
BEFORE UPDATE ON public.quote_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.customer_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_customer_id uuid NOT NULL REFERENCES public.business_customers(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  email text,
  phone text,
  is_primary boolean NOT NULL DEFAULT false,
  is_billing boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customer_contacts_customer ON public.customer_contacts(business_customer_id);
ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage all customer contacts" ON public.customer_contacts FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners manage their customer contacts" ON public.customer_contacts FOR ALL
USING (EXISTS (SELECT 1 FROM public.business_customers bc JOIN public.businesses b ON b.id = bc.business_id
  WHERE bc.id = customer_contacts.business_customer_id AND b.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.business_customers bc JOIN public.businesses b ON b.id = bc.business_id
  WHERE bc.id = customer_contacts.business_customer_id AND b.owner_id = auth.uid()));
CREATE TRIGGER update_customer_contacts_updated_at BEFORE UPDATE ON public.customer_contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.customer_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL,
  business_customer_id uuid REFERENCES public.business_customers(id) ON DELETE CASCADE,
  customer_email text,
  title text NOT NULL,
  document_type text NOT NULL DEFAULT 'other',
  storage_path text NOT NULL,
  file_size bigint,
  mime_type text,
  is_visible_to_customer boolean NOT NULL DEFAULT true,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customer_documents_customer ON public.customer_documents(business_customer_id);
CREATE INDEX idx_customer_documents_email ON public.customer_documents(customer_email);
CREATE INDEX idx_customer_documents_business ON public.customer_documents(business_id);
ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage all customer documents" ON public.customer_documents FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners manage their customer documents" ON public.customer_documents FOR ALL
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = customer_documents.business_id AND b.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = customer_documents.business_id AND b.owner_id = auth.uid()));
CREATE POLICY "Customers view their visible documents" ON public.customer_documents FOR SELECT
USING (
  is_visible_to_customer = true
  AND auth.uid() IS NOT NULL
  AND customer_email IS NOT NULL
  AND lower(customer_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
);
CREATE TRIGGER update_customer_documents_updated_at BEFORE UPDATE ON public.customer_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public) VALUES ('customer-documents', 'customer-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Owners manage their customer document files" ON storage.objects FOR ALL
USING (
  bucket_id = 'customer-documents'
  AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id::text = (storage.foldername(name))[1] AND b.owner_id = auth.uid())
)
WITH CHECK (
  bucket_id = 'customer-documents'
  AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id::text = (storage.foldername(name))[1] AND b.owner_id = auth.uid())
);

CREATE POLICY "Admins manage all customer document files" ON storage.objects FOR ALL
USING (bucket_id = 'customer-documents' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'customer-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customers read their own document files" ON storage.objects FOR SELECT
USING (
  bucket_id = 'customer-documents'
  AND EXISTS (
    SELECT 1 FROM public.customer_documents d
    WHERE d.storage_path = name
      AND d.is_visible_to_customer = true
      AND auth.uid() IS NOT NULL
      AND d.customer_email IS NOT NULL
      AND lower(d.customer_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  )
);

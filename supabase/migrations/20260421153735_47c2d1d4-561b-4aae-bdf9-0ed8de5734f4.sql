-- Private customers table
CREATE TABLE public.private_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  address text,
  zip_code text,
  city text,
  latitude numeric,
  longitude numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, email)
);

CREATE INDEX idx_private_customers_business ON public.private_customers(business_id);
CREATE INDEX idx_private_customers_email ON public.private_customers(email);

ALTER TABLE public.private_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners manage their private customers"
  ON public.private_customers FOR ALL
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = private_customers.business_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = private_customers.business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Admins manage all private customers"
  ON public.private_customers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_private_customers_updated_at
  BEFORE UPDATE ON public.private_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Business customers table
CREATE TABLE public.business_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  cvr text,
  contact_name text,
  email text NOT NULL,
  phone text,
  address text,
  zip_code text,
  city text,
  latitude numeric,
  longitude numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, email)
);

CREATE INDEX idx_business_customers_business ON public.business_customers(business_id);
CREATE INDEX idx_business_customers_email ON public.business_customers(email);
CREATE INDEX idx_business_customers_cvr ON public.business_customers(cvr);

ALTER TABLE public.business_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners manage their business customers"
  ON public.business_customers FOR ALL
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_customers.business_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_customers.business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Admins manage all business customers"
  ON public.business_customers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_business_customers_updated_at
  BEFORE UPDATE ON public.business_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
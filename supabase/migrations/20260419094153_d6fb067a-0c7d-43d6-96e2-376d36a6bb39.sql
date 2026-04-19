
-- Add settings jsonb to businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Employees table
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  title text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, email)
);

CREATE INDEX IF NOT EXISTS idx_employees_business ON public.employees(business_id);
CREATE INDEX IF NOT EXISTS idx_employees_user ON public.employees(user_id);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners manage their employees"
  ON public.employees FOR ALL
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = employees.business_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = employees.business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Employees view own record"
  ON public.employees FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins manage all employees"
  ON public.employees FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Employee invitations
CREATE TABLE IF NOT EXISTS public.employee_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_invitations_token ON public.employee_invitations(token);

ALTER TABLE public.employee_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners manage invitations"
  ON public.employee_invitations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = employee_invitations.business_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = employee_invitations.business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Anyone can view invitation by token"
  ON public.employee_invitations FOR SELECT
  USING (true);

CREATE POLICY "Admins manage all invitations"
  ON public.employee_invitations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Routes
CREATE TABLE IF NOT EXISTS public.routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  route_date date NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  total_distance_km numeric,
  optimized_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_routes_business_date ON public.routes(business_id, route_date);
CREATE INDEX IF NOT EXISTS idx_routes_employee ON public.routes(employee_id);

ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners manage their routes"
  ON public.routes FOR ALL
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = routes.business_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = routes.business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Employees view their own routes"
  ON public.routes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = routes.employee_id AND e.user_id = auth.uid()));

CREATE POLICY "Admins manage all routes"
  ON public.routes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Route stops
CREATE TABLE IF NOT EXISTS public.route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  sequence integer NOT NULL DEFAULT 0,
  planned_arrival timestamptz,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  notes text,
  photo_urls text[] DEFAULT '{}',
  address text,
  latitude numeric,
  longitude numeric,
  customer_name text,
  customer_phone text,
  service_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_route_stops_route ON public.route_stops(route_id);

ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners manage their route stops"
  ON public.route_stops FOR ALL
  USING (EXISTS (SELECT 1 FROM public.routes r JOIN public.businesses b ON b.id = r.business_id WHERE r.id = route_stops.route_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.routes r JOIN public.businesses b ON b.id = r.business_id WHERE r.id = route_stops.route_id AND b.owner_id = auth.uid()));

CREATE POLICY "Employees view their route stops"
  ON public.route_stops FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.routes r JOIN public.employees e ON e.id = r.employee_id WHERE r.id = route_stops.route_id AND e.user_id = auth.uid()));

CREATE POLICY "Employees update their route stops"
  ON public.route_stops FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.routes r JOIN public.employees e ON e.id = r.employee_id WHERE r.id = route_stops.route_id AND e.user_id = auth.uid()));

CREATE POLICY "Admins manage all route stops"
  ON public.route_stops FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_employees_updated ON public.employees;
CREATE TRIGGER trg_employees_updated BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_routes_updated ON public.routes;
CREATE TRIGGER trg_routes_updated BEFORE UPDATE ON public.routes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_route_stops_updated ON public.route_stops;
CREATE TRIGGER trg_route_stops_updated BEFORE UPDATE ON public.route_stops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-link employee on signup
CREATE OR REPLACE FUNCTION public.link_employee_to_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.employees
  SET user_id = NEW.id
  WHERE email = NEW.email AND user_id IS NULL;

  INSERT INTO public.user_roles (user_id, role)
  SELECT NEW.id, 'employee'::app_role
  WHERE EXISTS (SELECT 1 FROM public.employees WHERE email = NEW.email)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_link_employee ON auth.users;
CREATE TRIGGER on_auth_user_created_link_employee
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.link_employee_to_user();

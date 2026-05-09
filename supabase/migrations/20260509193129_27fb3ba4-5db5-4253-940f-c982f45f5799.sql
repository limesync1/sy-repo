
-- ============== Enums ==============
DO $$ BEGIN
  CREATE TYPE public.agreement_interval AS ENUM (
    'engangskøb','ugentlig','hver_14_dag','hver_4_uge','månedlig','kvartalsvis','halvårlig','årlig','custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.agreement_status AS ENUM ('draft','pending_approval','active','paused','ended','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.occurrence_status AS ENUM ('planned','completed','cancelled','skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============== route_templates ==============
CREATE TABLE public.route_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  weekday smallint, -- 0=mon..6=sun ; null = ad hoc
  default_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  start_address text,
  start_latitude numeric(10,7),
  start_longitude numeric(10,7),
  start_from_home boolean NOT NULL DEFAULT false,
  planned_start_time time NOT NULL DEFAULT '08:00',
  color text NOT NULL DEFAULT '#14b8a6',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_route_templates_business ON public.route_templates(business_id);
ALTER TABLE public.route_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage route templates" ON public.route_templates
  FOR ALL USING (public.is_business_owner(business_id, auth.uid()))
  WITH CHECK (public.is_business_owner(business_id, auth.uid()));
CREATE POLICY "Admins manage all route templates" ON public.route_templates
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Employees view own business templates" ON public.route_templates
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.business_id = route_templates.business_id AND e.user_id = auth.uid()
  ));
CREATE TRIGGER trg_route_templates_updated BEFORE UPDATE ON public.route_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== agreements ==============
CREATE TABLE public.agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  business_customer_id uuid REFERENCES public.business_customers(id) ON DELETE SET NULL,
  customer_id uuid,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  company_name text,
  cvr text,
  address text,
  zip_code text,
  city text,
  latitude numeric(10,7),
  longitude numeric(10,7),

  start_date date NOT NULL,
  end_date date,
  interval public.agreement_interval NOT NULL DEFAULT 'engangskøb',
  interval_days integer, -- only used when interval = 'custom'

  default_route_template_id uuid REFERENCES public.route_templates(id) ON DELETE SET NULL,
  preferred_time_start time,
  preferred_time_end time,
  estimated_duration_minutes integer,
  employee_ids uuid[] NOT NULL DEFAULT '{}', -- override; empty = arv fra service

  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  status public.agreement_status NOT NULL DEFAULT 'active',

  -- approval (én godkendelse pr. serie)
  requires_customer_approval boolean NOT NULL DEFAULT false,
  approval_token text,
  approval_expires_at timestamptz,
  business_response text,
  business_message text,
  adjusted_amount numeric,
  adjusted_details jsonb,
  customer_response text,

  -- accounting / payment terms (per-faktura ligger på occurrences)
  payment_terms_days integer,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agreements_business ON public.agreements(business_id);
CREATE INDEX idx_agreements_customer ON public.agreements(business_customer_id);
CREATE INDEX idx_agreements_status ON public.agreements(business_id, status);
CREATE UNIQUE INDEX idx_agreements_approval_token ON public.agreements(approval_token) WHERE approval_token IS NOT NULL;
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage agreements" ON public.agreements
  FOR ALL USING (public.is_business_owner(business_id, auth.uid()))
  WITH CHECK (public.is_business_owner(business_id, auth.uid()));
CREATE POLICY "Admins manage all agreements" ON public.agreements
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Customer reads own agreements" ON public.agreements
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      customer_id = auth.uid()
      OR lower(customer_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
    )
  );
CREATE TRIGGER trg_agreements_updated BEFORE UPDATE ON public.agreements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== agreement_items ==============
CREATE TABLE public.agreement_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  total_price numeric(10,2) NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agreement_items_agreement ON public.agreement_items(agreement_id);
ALTER TABLE public.agreement_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage agreement items" ON public.agreement_items
  FOR ALL USING (EXISTS (SELECT 1 FROM public.agreements a WHERE a.id = agreement_items.agreement_id AND public.is_business_owner(a.business_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agreements a WHERE a.id = agreement_items.agreement_id AND public.is_business_owner(a.business_id, auth.uid())));
CREATE POLICY "Admins manage all agreement items" ON public.agreement_items
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Customer reads own agreement items" ON public.agreement_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.agreements a
    WHERE a.id = agreement_items.agreement_id
      AND auth.uid() IS NOT NULL
      AND (a.customer_id = auth.uid() OR lower(a.customer_email) = lower(coalesce((auth.jwt() ->> 'email'),'')))
  ));

-- ============== agreement_occurrences ==============
CREATE TABLE public.agreement_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  occurrence_date date NOT NULL,
  sequence_index integer NOT NULL DEFAULT 0,
  route_id uuid REFERENCES public.routes(id) ON DELETE SET NULL,
  status public.occurrence_status NOT NULL DEFAULT 'planned',
  employee_ids uuid[] NOT NULL DEFAULT '{}', -- override, empty = arv fra agreement
  planned_arrival timestamptz,
  completed_at timestamptz,
  notes text,

  -- per-faktura/payment
  payment_status public.order_payment_status,
  paid_at timestamptz,
  paid_amount numeric,
  due_date date,
  invoice_external_id text,
  invoice_status text,
  invoiced_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (agreement_id, occurrence_date)
);
CREATE INDEX idx_agreement_occ_business_date ON public.agreement_occurrences(business_id, occurrence_date);
CREATE INDEX idx_agreement_occ_route ON public.agreement_occurrences(route_id);
CREATE INDEX idx_agreement_occ_agreement ON public.agreement_occurrences(agreement_id, occurrence_date);
ALTER TABLE public.agreement_occurrences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage occurrences" ON public.agreement_occurrences
  FOR ALL USING (public.is_business_owner(business_id, auth.uid()))
  WITH CHECK (public.is_business_owner(business_id, auth.uid()));
CREATE POLICY "Admins manage all occurrences" ON public.agreement_occurrences
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Employees see occurrences on their routes" ON public.agreement_occurrences
  FOR SELECT USING (
    route_id IS NOT NULL AND public.is_route_assigned_employee(route_id, auth.uid())
  );
CREATE TRIGGER trg_agreement_occ_updated BEFORE UPDATE ON public.agreement_occurrences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== Service: default_employee_ids ==============
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS default_employee_ids uuid[] NOT NULL DEFAULT '{}';

-- ============== Routes & route_stops koblinger ==============
ALTER TABLE public.routes
  ADD COLUMN IF NOT EXISTS route_template_id uuid REFERENCES public.route_templates(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_routes_template ON public.routes(route_template_id);

ALTER TABLE public.route_stops
  ADD COLUMN IF NOT EXISTS agreement_occurrence_id uuid REFERENCES public.agreement_occurrences(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_route_stops_occurrence ON public.route_stops(agreement_occurrence_id);

-- ============== Helper: interval to days ==============
CREATE OR REPLACE FUNCTION public.agreement_interval_days(_interval public.agreement_interval, _custom_days integer)
RETURNS integer
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _interval
    WHEN 'engangskøb' THEN NULL
    WHEN 'ugentlig'   THEN 7
    WHEN 'hver_14_dag'THEN 14
    WHEN 'hver_4_uge' THEN 28
    WHEN 'månedlig'   THEN 30
    WHEN 'kvartalsvis'THEN 90
    WHEN 'halvårlig'  THEN 180
    WHEN 'årlig'      THEN 365
    WHEN 'custom'     THEN GREATEST(COALESCE(_custom_days, 0), 1)
  END
$$;

-- ============== RPC: ensure_agreement_occurrences ==============
-- Materialiser manglende forekomster for alle aktive aftaler i en business frem til _until_date.
CREATE OR REPLACE FUNCTION public.ensure_agreement_occurrences(_business_id uuid, _until_date date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_authorized boolean;
  v_agreement RECORD;
  v_step int;
  v_date date;
  v_horizon date;
  v_idx int;
  v_inserted int := 0;
BEGIN
  -- Auth
  SELECT (public.is_business_owner(_business_id, auth.uid()) OR public.has_role(auth.uid(),'admin'))
    INTO v_authorized;
  IF NOT v_authorized THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_horizon := LEAST(_until_date, current_date + interval '2 years');

  FOR v_agreement IN
    SELECT * FROM public.agreements
    WHERE business_id = _business_id
      AND status IN ('active','pending_approval')
      AND start_date <= v_horizon
  LOOP
    v_step := public.agreement_interval_days(v_agreement.interval, v_agreement.interval_days);
    v_date := v_agreement.start_date;
    v_idx  := 0;

    -- engangskøb: kun én forekomst på start_date
    IF v_step IS NULL THEN
      IF v_date <= v_horizon
         AND (v_agreement.end_date IS NULL OR v_date <= v_agreement.end_date) THEN
        INSERT INTO public.agreement_occurrences
          (agreement_id, business_id, occurrence_date, sequence_index, employee_ids, planned_arrival)
        VALUES
          (v_agreement.id, v_agreement.business_id, v_date, 0, v_agreement.employee_ids,
           CASE WHEN v_agreement.preferred_time_start IS NOT NULL
                THEN ((v_date::timestamp + v_agreement.preferred_time_start) AT TIME ZONE 'Europe/Copenhagen')
                ELSE NULL END)
        ON CONFLICT (agreement_id, occurrence_date) DO NOTHING;
        IF FOUND THEN v_inserted := v_inserted + 1; END IF;
      END IF;
      CONTINUE;
    END IF;

    -- recurring: gå frem så længe vi er inden horisonten / slutdato
    WHILE v_date <= v_horizon LOOP
      EXIT WHEN v_agreement.end_date IS NOT NULL AND v_date > v_agreement.end_date;
      INSERT INTO public.agreement_occurrences
        (agreement_id, business_id, occurrence_date, sequence_index, employee_ids, planned_arrival)
      VALUES
        (v_agreement.id, v_agreement.business_id, v_date, v_idx, v_agreement.employee_ids,
         CASE WHEN v_agreement.preferred_time_start IS NOT NULL
              THEN ((v_date::timestamp + v_agreement.preferred_time_start) AT TIME ZONE 'Europe/Copenhagen')
              ELSE NULL END)
      ON CONFLICT (agreement_id, occurrence_date) DO NOTHING;
      IF FOUND THEN v_inserted := v_inserted + 1; END IF;
      v_idx := v_idx + 1;
      v_date := v_date + (v_step || ' days')::interval;
    END LOOP;
  END LOOP;

  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_agreement_occurrences(uuid, date) TO authenticated;

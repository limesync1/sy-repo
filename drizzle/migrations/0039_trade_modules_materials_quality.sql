CREATE OR REPLACE FUNCTION public.is_business_employee(_business_id uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM employees e WHERE e.business_id = _business_id AND e.user_id = _uid AND e.is_active IS DISTINCT FROM false);
$$;

CREATE TABLE public.material_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  supplier text NOT NULL DEFAULT 'Egen',
  sku text NOT NULL DEFAULT '',
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'stk',
  cost_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  sale_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX material_catalog_sku_uq ON public.material_catalog(business_id, supplier, sku) WHERE sku <> '';
CREATE INDEX material_catalog_business_idx ON public.material_catalog(business_id, name);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_catalog TO authenticated;
GRANT ALL ON public.material_catalog TO service_role;
ALTER TABLE public.material_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage material catalog" ON public.material_catalog FOR ALL TO authenticated
  USING (is_business_owner(business_id, auth.uid()) OR has_role(auth.uid(),'admin'))
  WITH CHECK (is_business_owner(business_id, auth.uid()) OR has_role(auth.uid(),'admin'));
CREATE POLICY "Employees read material catalog" ON public.material_catalog FOR SELECT TO authenticated
  USING (is_business_employee(business_id, auth.uid()));

CREATE TABLE public.order_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  stop_id uuid,
  catalog_id uuid REFERENCES public.material_catalog(id) ON DELETE SET NULL,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'stk',
  quantity numeric(12,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  cost_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  added_by uuid,
  added_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_materials_order_idx ON public.order_materials(order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_materials TO authenticated;
GRANT ALL ON public.order_materials TO service_role;
ALTER TABLE public.order_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage order materials" ON public.order_materials FOR ALL TO authenticated
  USING (is_business_owner(business_id, auth.uid()) OR has_role(auth.uid(),'admin'))
  WITH CHECK (is_business_owner(business_id, auth.uid()) OR has_role(auth.uid(),'admin'));
CREATE POLICY "Employees view stop materials" ON public.order_materials FOR SELECT TO authenticated
  USING (stop_id IS NOT NULL AND can_access_stop(stop_id));
CREATE POLICY "Employees add stop materials" ON public.order_materials FOR INSERT TO authenticated
  WITH CHECK (stop_id IS NOT NULL AND can_access_stop(stop_id) AND added_by = auth.uid() AND catalog_id IS NOT NULL);
CREATE POLICY "Employees remove own stop materials" ON public.order_materials FOR DELETE TO authenticated
  USING (added_by = auth.uid() AND stop_id IS NOT NULL AND can_access_stop(stop_id));

-- Server sætter navn og priser fra kataloget; tjekker at ordre/stop hører til virksomheden.
CREATE OR REPLACE FUNCTION public._order_materials_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; o_business uuid; s_business uuid; s_order uuid;
BEGIN
  SELECT business_id INTO o_business FROM orders WHERE id = NEW.order_id;
  IF o_business IS NULL OR o_business <> NEW.business_id THEN RAISE EXCEPTION 'Ordren hører ikke til virksomheden'; END IF;
  IF NEW.stop_id IS NOT NULL THEN
    SELECT r.business_id, rs.order_id INTO s_business, s_order FROM route_stops rs JOIN routes r ON r.id = rs.route_id WHERE rs.id = NEW.stop_id;
    IF s_business IS DISTINCT FROM NEW.business_id OR s_order IS DISTINCT FROM NEW.order_id THEN RAISE EXCEPTION 'Besøget passer ikke til ordren'; END IF;
  END IF;
  IF NEW.catalog_id IS NOT NULL THEN
    SELECT * INTO c FROM material_catalog WHERE id = NEW.catalog_id;
    IF c.id IS NULL OR c.business_id <> NEW.business_id THEN RAISE EXCEPTION 'Materialet findes ikke'; END IF;
    NEW.name := c.name; NEW.unit := c.unit; NEW.unit_price := c.sale_price; NEW.cost_price := c.cost_price;
  ELSIF NOT (is_business_owner(NEW.business_id, auth.uid()) OR has_role(auth.uid(),'admin') OR auth.uid() IS NULL) THEN
    RAISE EXCEPTION 'Vælg materialet fra listen';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER order_materials_guard BEFORE INSERT OR UPDATE ON public.order_materials
  FOR EACH ROW EXECUTE FUNCTION public._order_materials_guard();

CREATE TABLE public.quality_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quality_templates_business_idx ON public.quality_templates(business_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quality_templates TO authenticated;
GRANT ALL ON public.quality_templates TO service_role;
ALTER TABLE public.quality_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage quality templates" ON public.quality_templates FOR ALL TO authenticated
  USING (is_business_owner(business_id, auth.uid()) OR has_role(auth.uid(),'admin'))
  WITH CHECK (is_business_owner(business_id, auth.uid()) OR has_role(auth.uid(),'admin'));
CREATE POLICY "Employees read quality templates" ON public.quality_templates FOR SELECT TO authenticated
  USING (is_business_employee(business_id, auth.uid()));

CREATE TABLE public.quality_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  stop_id uuid,
  template_id uuid REFERENCES public.quality_templates(id) ON DELETE SET NULL,
  template_name text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  signer_name text,
  signature text,
  completed_by uuid,
  completed_by_name text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quality_checklists_order_idx ON public.quality_checklists(order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quality_checklists TO authenticated;
GRANT ALL ON public.quality_checklists TO service_role;
ALTER TABLE public.quality_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage quality checklists" ON public.quality_checklists FOR ALL TO authenticated
  USING (is_business_owner(business_id, auth.uid()) OR has_role(auth.uid(),'admin'))
  WITH CHECK (is_business_owner(business_id, auth.uid()) OR has_role(auth.uid(),'admin'));
CREATE POLICY "Employees view stop checklists" ON public.quality_checklists FOR SELECT TO authenticated
  USING (stop_id IS NOT NULL AND can_access_stop(stop_id));
CREATE POLICY "Employees create stop checklists" ON public.quality_checklists FOR INSERT TO authenticated
  WITH CHECK (stop_id IS NOT NULL AND can_access_stop(stop_id) AND completed_by = auth.uid());
CREATE POLICY "Employees update own open checklists" ON public.quality_checklists FOR UPDATE TO authenticated
  USING (stop_id IS NOT NULL AND can_access_stop(stop_id) AND completed_by = auth.uid())
  WITH CHECK (stop_id IS NOT NULL AND can_access_stop(stop_id) AND completed_by = auth.uid());

CREATE OR REPLACE FUNCTION public._quality_checklists_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o_business uuid; s_business uuid; s_order uuid;
BEGIN
  SELECT business_id INTO o_business FROM orders WHERE id = NEW.order_id;
  IF o_business IS NULL OR o_business <> NEW.business_id THEN RAISE EXCEPTION 'Ordren hører ikke til virksomheden'; END IF;
  IF NEW.stop_id IS NOT NULL THEN
    SELECT r.business_id, rs.order_id INTO s_business, s_order FROM route_stops rs JOIN routes r ON r.id = rs.route_id WHERE rs.id = NEW.stop_id;
    IF s_business IS DISTINCT FROM NEW.business_id OR s_order IS DISTINCT FROM NEW.order_id THEN RAISE EXCEPTION 'Besøget passer ikke til ordren'; END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER quality_checklists_guard BEFORE INSERT OR UPDATE ON public.quality_checklists
  FOR EACH ROW EXECUTE FUNCTION public._quality_checklists_guard();
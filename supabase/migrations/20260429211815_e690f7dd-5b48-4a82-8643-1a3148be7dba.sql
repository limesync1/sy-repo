-- ============================================
-- ACCOUNTING INTEGRATIONS
-- ============================================

CREATE TABLE public.accounting_integrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL UNIQUE,
  provider text NOT NULL CHECK (provider IN ('economic', 'billy', 'dinero')),
  is_active boolean NOT NULL DEFAULT true,
  -- Credentials (stored encrypted at app layer / kept here as text for v1; rotate via UI)
  api_token text,
  api_secret text,
  agreement_number text,           -- e-conomic: agreement grant number
  organization_id text,            -- billy/dinero: organization id
  -- Sync state
  last_pull_at timestamptz,
  last_push_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  -- Settings (JSONB so we can extend per provider without migrations)
  -- Example: { "push_pending": true, "default_payment_terms_days": 14, "default_vat_rate": 25,
  --            "auto_create_products": true, "default_product_account": "1000",
  --            "send_order_as": "order" }   // "order" | "invoice_draft" | "quote"
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their accounting integration"
  ON public.accounting_integrations FOR ALL
  USING (EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Admins manage all accounting integrations"
  ON public.accounting_integrations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_accounting_integrations_updated_at
  BEFORE UPDATE ON public.accounting_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_accounting_integrations_business ON public.accounting_integrations(business_id);

-- ============================================
-- CUSTOMER LINKS (business_customers + private_customers)
-- ============================================

CREATE TABLE public.accounting_customer_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL,
  provider text NOT NULL,
  -- Either business_customer_id OR private_customer_id is set
  business_customer_id uuid,
  private_customer_id uuid,
  external_id text NOT NULL,                -- id in accounting system
  external_customer_number text,            -- human-readable customer no.
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  last_direction text NOT NULL DEFAULT 'push' CHECK (last_direction IN ('push', 'pull')),
  external_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_link_one_target CHECK (
    (business_customer_id IS NOT NULL)::int + (private_customer_id IS NOT NULL)::int = 1
  ),
  UNIQUE (business_id, provider, external_id)
);

ALTER TABLE public.accounting_customer_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their customer links"
  ON public.accounting_customer_links FOR ALL
  USING (EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Admins manage all customer links"
  ON public.accounting_customer_links FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_accounting_customer_links_updated_at
  BEFORE UPDATE ON public.accounting_customer_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_acl_business ON public.accounting_customer_links(business_id);
CREATE INDEX idx_acl_business_customer ON public.accounting_customer_links(business_customer_id) WHERE business_customer_id IS NOT NULL;
CREATE INDEX idx_acl_private_customer ON public.accounting_customer_links(private_customer_id) WHERE private_customer_id IS NOT NULL;

-- ============================================
-- PRODUCT LINKS (services <-> products)
-- ============================================

CREATE TABLE public.accounting_product_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL,
  provider text NOT NULL,
  service_id uuid NOT NULL,
  external_id text NOT NULL,                -- product id in accounting system
  external_product_number text,             -- human-readable product no. (varenr.)
  is_manual_override boolean NOT NULL DEFAULT false,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  external_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, provider, service_id),
  UNIQUE (business_id, provider, external_id)
);

ALTER TABLE public.accounting_product_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their product links"
  ON public.accounting_product_links FOR ALL
  USING (EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Admins manage all product links"
  ON public.accounting_product_links FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_accounting_product_links_updated_at
  BEFORE UPDATE ON public.accounting_product_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_apl_business ON public.accounting_product_links(business_id);
CREATE INDEX idx_apl_service ON public.accounting_product_links(service_id);

-- ============================================
-- ORDER LINKS (orders <-> external orders/drafts/quotes)
-- ============================================

CREATE TABLE public.accounting_order_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL,
  provider text NOT NULL,
  order_id uuid NOT NULL,
  external_id text NOT NULL,
  external_number text,                     -- human-readable order/invoice no.
  external_type text NOT NULL DEFAULT 'order'
    CHECK (external_type IN ('order', 'invoice_draft', 'invoice_booked', 'quote')),
  last_pushed_at timestamptz NOT NULL DEFAULT now(),
  last_status_synced text,
  external_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, provider, order_id),
  UNIQUE (business_id, provider, external_id)
);

ALTER TABLE public.accounting_order_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their order links"
  ON public.accounting_order_links FOR ALL
  USING (EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Admins manage all order links"
  ON public.accounting_order_links FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_accounting_order_links_updated_at
  BEFORE UPDATE ON public.accounting_order_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_aol_business ON public.accounting_order_links(business_id);
CREATE INDEX idx_aol_order ON public.accounting_order_links(order_id);

-- ============================================
-- SYNC LOG
-- ============================================

CREATE TABLE public.accounting_sync_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL,
  provider text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('push', 'pull')),
  entity_type text NOT NULL CHECK (entity_type IN ('customer', 'product', 'order', 'connection')),
  entity_id uuid,                  -- internal id when applicable
  external_id text,
  status text NOT NULL CHECK (status IN ('success', 'error', 'skipped')),
  message text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view their sync log"
  ON public.accounting_sync_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Admins manage all sync log"
  ON public.accounting_sync_log FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_asl_business_created ON public.accounting_sync_log(business_id, created_at DESC);

-- ============================================
-- SYNC QUEUE (push jobs - filled by triggers, drained by edge function)
-- ============================================

CREATE TABLE public.accounting_sync_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('customer', 'product', 'order')),
  entity_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  attempts integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  last_error text,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view their sync queue"
  ON public.accounting_sync_queue FOR SELECT
  USING (EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Admins manage all sync queue"
  ON public.accounting_sync_queue FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_accounting_sync_queue_updated_at
  BEFORE UPDATE ON public.accounting_sync_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_asq_pending ON public.accounting_sync_queue(business_id, status, scheduled_for)
  WHERE status IN ('pending', 'failed');

-- ============================================
-- EXTRA FIELDS ON EXISTING TABLES
-- ============================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS external_order_number text,
  ADD COLUMN IF NOT EXISTS accounting_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_terms_days integer,
  ADD COLUMN IF NOT EXISTS accounting_notes text;

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS default_vat_rate numeric(5,2) DEFAULT 25,
  ADD COLUMN IF NOT EXISTS accounting_account_number text;

ALTER TABLE public.business_customers
  ADD COLUMN IF NOT EXISTS payment_terms_days integer,
  ADD COLUMN IF NOT EXISTS ean_number text,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'DKK';

ALTER TABLE public.private_customers
  ADD COLUMN IF NOT EXISTS payment_terms_days integer,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'DKK';

-- ============================================
-- TRIGGERS: enqueue sync jobs on changes
-- ============================================

CREATE OR REPLACE FUNCTION public.enqueue_accounting_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_entity_type text;
  v_entity_id uuid;
  v_op text;
  v_has_integration boolean;
BEGIN
  -- Determine entity + business
  IF TG_TABLE_NAME = 'orders' THEN
    v_entity_type := 'order';
    v_business_id := COALESCE(NEW.business_id, OLD.business_id);
    v_entity_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'services' THEN
    v_entity_type := 'product';
    v_business_id := COALESCE(NEW.business_id, OLD.business_id);
    v_entity_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'business_customers' OR TG_TABLE_NAME = 'private_customers' THEN
    v_entity_type := 'customer';
    v_business_id := COALESCE(NEW.business_id, OLD.business_id);
    v_entity_id := COALESCE(NEW.id, OLD.id);
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_business_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Only enqueue if business has an active integration
  SELECT EXISTS (
    SELECT 1 FROM public.accounting_integrations
    WHERE business_id = v_business_id AND is_active = true
  ) INTO v_has_integration;

  IF NOT v_has_integration THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_op := CASE TG_OP
            WHEN 'INSERT' THEN 'create'
            WHEN 'UPDATE' THEN 'update'
            WHEN 'DELETE' THEN 'delete'
          END;

  INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation)
  VALUES (v_business_id, v_entity_type, v_entity_id, v_op);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_sync_orders ON public.orders;
CREATE TRIGGER trg_enqueue_sync_orders
  AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_accounting_sync();

DROP TRIGGER IF EXISTS trg_enqueue_sync_services ON public.services;
CREATE TRIGGER trg_enqueue_sync_services
  AFTER INSERT OR UPDATE OR DELETE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_accounting_sync();

DROP TRIGGER IF EXISTS trg_enqueue_sync_business_customers ON public.business_customers;
CREATE TRIGGER trg_enqueue_sync_business_customers
  AFTER INSERT OR UPDATE OR DELETE ON public.business_customers
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_accounting_sync();

DROP TRIGGER IF EXISTS trg_enqueue_sync_private_customers ON public.private_customers;
CREATE TRIGGER trg_enqueue_sync_private_customers
  AFTER INSERT OR UPDATE OR DELETE ON public.private_customers
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_accounting_sync();
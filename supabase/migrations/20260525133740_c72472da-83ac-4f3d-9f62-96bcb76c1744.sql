
CREATE TABLE IF NOT EXISTS public.route_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL,
  actor_id        UUID,
  route_id        UUID,
  agreement_id    UUID,
  action          TEXT NOT NULL,
  scope           TEXT,
  affected_count  INTEGER NOT NULL DEFAULT 0,
  before_data     JSONB,
  after_data      JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_route_audit_business_created
  ON public.route_audit_log(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_route_audit_route
  ON public.route_audit_log(route_id) WHERE route_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_route_audit_agreement
  ON public.route_audit_log(agreement_id) WHERE agreement_id IS NOT NULL;

ALTER TABLE public.route_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all route audit"
  ON public.route_audit_log FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners view their route audit"
  ON public.route_audit_log FOR SELECT
  USING (is_business_owner(business_id, auth.uid()));

CREATE POLICY "Owners insert their route audit"
  ON public.route_audit_log FOR INSERT
  WITH CHECK (is_business_owner(business_id, auth.uid()));

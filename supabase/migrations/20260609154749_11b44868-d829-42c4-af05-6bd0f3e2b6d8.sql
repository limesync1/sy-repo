-- 1. Health alerts table (platform-level, admin-only)
CREATE TABLE IF NOT EXISTS public.accounting_health_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                        -- 'duplicate_order' | 'missing_link' | 'orphan_external_id'
  severity TEXT NOT NULL DEFAULT 'warning',  -- 'info' | 'warning' | 'critical'
  summary TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'open',       -- 'open' | 'resolved'
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  occurrence_count INT NOT NULL DEFAULT 1,
  dedupe_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, kind, dedupe_key)
);

GRANT SELECT, UPDATE ON public.accounting_health_alerts TO authenticated;
GRANT ALL ON public.accounting_health_alerts TO service_role;

ALTER TABLE public.accounting_health_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can read accounting health alerts"
  ON public.accounting_health_alerts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Platform admins can update accounting health alerts"
  ON public.accounting_health_alerts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_acct_health_alerts_open
  ON public.accounting_health_alerts(status, last_seen_at DESC)
  WHERE status = 'open';

-- 2. Idempotent upsert helper
CREATE OR REPLACE FUNCTION public._acct_health_record(
  p_business_id UUID,
  p_kind TEXT,
  p_dedupe_key TEXT,
  p_severity TEXT,
  p_summary TEXT,
  p_details JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.accounting_health_alerts AS h
    (business_id, kind, dedupe_key, severity, summary, details, status,
     first_seen_at, last_seen_at, occurrence_count)
  VALUES
    (p_business_id, p_kind, p_dedupe_key, p_severity, p_summary, p_details, 'open',
     now(), now(), 1)
  ON CONFLICT (business_id, kind, dedupe_key) DO UPDATE
  SET last_seen_at = now(),
      occurrence_count = h.occurrence_count + 1,
      severity = EXCLUDED.severity,
      summary = EXCLUDED.summary,
      details = EXCLUDED.details,
      status = 'open',
      resolved_at = NULL,
      updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- 3. Daily idempotency / duplicate scanner
CREATE OR REPLACE FUNCTION public.accounting_health_check_run()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dup_count INT := 0;
  v_missing_link_count INT := 0;
  v_orphan_count INT := 0;
  r RECORD;
BEGIN
  -- (A) Duplicate orders: more than 1 order per customer+day where both touch accounting
  FOR r IN
    SELECT o.business_id,
           o.customer_id,
           o.customer_name,
           date(COALESCE(o.next_service_date, o.created_at)) AS d,
           count(*) AS cnt,
           array_agg(o.id::text ORDER BY o.created_at) AS order_ids,
           array_agg(o.external_order_number ORDER BY o.created_at) AS ext_nums
    FROM public.orders o
    WHERE o.created_at > now() - interval '30 days'
      AND o.customer_id IS NOT NULL
      AND o.external_order_number IS NOT NULL
    GROUP BY o.business_id, o.customer_id, o.customer_name, d
    HAVING count(*) > 1
  LOOP
    v_dup_count := v_dup_count + 1;
    PERFORM public._acct_health_record(
      r.business_id,
      'duplicate_order',
      r.customer_id::text || '|' || r.d::text,
      'critical',
      format('%s ordrer for %s den %s', r.cnt, r.customer_name, r.d),
      jsonb_build_object(
        'customer_id', r.customer_id,
        'customer_name', r.customer_name,
        'date', r.d,
        'count', r.cnt,
        'order_ids', r.order_ids,
        'external_order_numbers', r.ext_nums
      )
    );
  END LOOP;

  -- (B) Missing accounting_order_links: orders with external_order_number but no link row
  FOR r IN
    SELECT o.business_id, o.id AS order_id, o.customer_name, o.external_order_number
    FROM public.orders o
    LEFT JOIN public.accounting_order_links l
      ON l.business_id = o.business_id AND l.order_id = o.id
    WHERE o.accounting_synced_at IS NOT NULL
      AND o.external_order_number IS NOT NULL
      AND o.accounting_synced_at > now() - interval '30 days'
      AND l.id IS NULL
  LOOP
    v_missing_link_count := v_missing_link_count + 1;
    PERFORM public._acct_health_record(
      r.business_id,
      'missing_link',
      r.order_id::text,
      'warning',
      format('Ordre %s (%s) er synket men mangler lokal link-række', r.external_order_number, r.customer_name),
      jsonb_build_object(
        'order_id', r.order_id,
        'customer_name', r.customer_name,
        'external_order_number', r.external_order_number
      )
    );
  END LOOP;

  -- (C) Orphan external IDs: link row points to deleted order
  FOR r IN
    SELECT l.business_id, l.id AS link_id, l.order_id, l.external_id, l.provider
    FROM public.accounting_order_links l
    LEFT JOIN public.orders o ON o.id = l.order_id
    WHERE o.id IS NULL
      AND l.created_at > now() - interval '30 days'
  LOOP
    v_orphan_count := v_orphan_count + 1;
    PERFORM public._acct_health_record(
      r.business_id,
      'orphan_external_id',
      r.link_id::text,
      'warning',
      format('Regnskabs-link (%s #%s) peger på slettet ordre', r.provider, r.external_id),
      jsonb_build_object(
        'link_id', r.link_id,
        'order_id', r.order_id,
        'external_id', r.external_id,
        'provider', r.provider
      )
    );
  END LOOP;

  -- Auto-resolve alerts that haven't recurred in 48h
  UPDATE public.accounting_health_alerts
  SET status = 'resolved', resolved_at = now(), updated_at = now()
  WHERE status = 'open' AND last_seen_at < now() - interval '48 hours';

  RETURN jsonb_build_object(
    'ran_at', now(),
    'duplicates', v_dup_count,
    'missing_links', v_missing_link_count,
    'orphan_links', v_orphan_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accounting_health_check_run() TO service_role;
GRANT EXECUTE ON FUNCTION public.accounting_health_check_run() TO authenticated;

-- 4. Read-helper for UI
CREATE OR REPLACE FUNCTION public.accounting_health_summary()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_open INT;
  v_critical INT;
  v_by_kind JSONB;
  v_last_run TIMESTAMPTZ;
  v_recent JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT count(*) INTO v_open
    FROM public.accounting_health_alerts WHERE status = 'open';
  SELECT count(*) INTO v_critical
    FROM public.accounting_health_alerts WHERE status = 'open' AND severity = 'critical';
  SELECT jsonb_object_agg(kind, c) INTO v_by_kind
    FROM (SELECT kind, count(*) AS c FROM public.accounting_health_alerts
          WHERE status = 'open' GROUP BY kind) t;
  SELECT max(last_seen_at) INTO v_last_run FROM public.accounting_health_alerts;
  SELECT jsonb_agg(row_to_json(t)) INTO v_recent FROM (
    SELECT id, business_id, kind, severity, summary, details, occurrence_count,
           first_seen_at, last_seen_at
    FROM public.accounting_health_alerts
    WHERE status = 'open'
    ORDER BY severity = 'critical' DESC, last_seen_at DESC
    LIMIT 50
  ) t;
  RETURN jsonb_build_object(
    'open_count', COALESCE(v_open, 0),
    'critical_count', COALESCE(v_critical, 0),
    'by_kind', COALESCE(v_by_kind, '{}'::jsonb),
    'last_seen_at', v_last_run,
    'alerts', COALESCE(v_recent, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accounting_health_summary() TO authenticated;
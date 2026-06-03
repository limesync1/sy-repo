-- Dedupe duplicate accounting_customer_links: keep newest per (business_id, provider, private_customer_id)
DELETE FROM public.accounting_customer_links a
USING public.accounting_customer_links b
WHERE a.private_customer_id IS NOT NULL
  AND a.private_customer_id = b.private_customer_id
  AND a.business_id = b.business_id
  AND a.provider = b.provider
  AND a.created_at < b.created_at;

DELETE FROM public.accounting_customer_links a
USING public.accounting_customer_links b
WHERE a.business_customer_id IS NOT NULL
  AND a.business_customer_id = b.business_customer_id
  AND a.business_id = b.business_id
  AND a.provider = b.provider
  AND a.created_at < b.created_at;

-- Same-timestamp tie-breaker: keep the one with smallest id
DELETE FROM public.accounting_customer_links a
USING public.accounting_customer_links b
WHERE a.private_customer_id IS NOT NULL
  AND a.private_customer_id = b.private_customer_id
  AND a.business_id = b.business_id
  AND a.provider = b.provider
  AND a.created_at = b.created_at
  AND a.id > b.id;

DELETE FROM public.accounting_customer_links a
USING public.accounting_customer_links b
WHERE a.business_customer_id IS NOT NULL
  AND a.business_customer_id = b.business_customer_id
  AND a.business_id = b.business_id
  AND a.provider = b.provider
  AND a.created_at = b.created_at
  AND a.id > b.id;

-- Prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS accounting_customer_links_private_unique
  ON public.accounting_customer_links (business_id, provider, private_customer_id)
  WHERE private_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS accounting_customer_links_business_unique
  ON public.accounting_customer_links (business_id, provider, business_customer_id)
  WHERE business_customer_id IS NOT NULL;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS invoice_external_number text;

ALTER TABLE public.agreement_occurrences
  ADD COLUMN IF NOT EXISTS external_order_number text,
  ADD COLUMN IF NOT EXISTS invoice_external_number text;

-- Backfill orders.invoice_external_number fra link-tabellen
UPDATE public.orders o
SET invoice_external_number = l.external_number
FROM public.accounting_order_links l
WHERE l.order_id = o.id
  AND l.external_type = 'invoice_booked'
  AND o.invoice_external_id IS NOT NULL
  AND o.invoice_external_number IS NULL
  AND l.external_number IS NOT NULL;

-- Backfill agreement_occurrences ordre- og fakturanumre
UPDATE public.agreement_occurrences ao
SET external_order_number = l.external_number
FROM public.accounting_order_links l
WHERE l.agreement_occurrence_id = ao.id
  AND l.external_type IN ('order','invoice_draft','quote')
  AND ao.external_order_number IS NULL
  AND l.external_number IS NOT NULL;

UPDATE public.agreement_occurrences ao
SET invoice_external_number = l.external_number
FROM public.accounting_order_links l
WHERE l.agreement_occurrence_id = ao.id
  AND l.external_type = 'invoice_booked'
  AND ao.invoice_external_id IS NOT NULL
  AND ao.invoice_external_number IS NULL
  AND l.external_number IS NOT NULL;
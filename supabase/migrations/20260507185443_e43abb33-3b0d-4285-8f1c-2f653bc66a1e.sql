UPDATE public.accounting_order_links l
SET external_id = o.invoice_external_id,
    external_number = o.invoice_external_id,
    external_type = 'invoice_booked',
    last_status_synced = COALESCE(o.invoice_status, 'booked'),
    last_pushed_at = now(),
    updated_at = now()
FROM public.orders o
WHERE l.order_id = o.id
  AND o.invoice_external_id IS NOT NULL
  AND o.invoice_external_id <> ''
  AND l.external_type <> 'invoice_booked';

UPDATE public.accounting_sync_queue q
SET status = 'done',
    processed_at = now(),
    last_error = 'Skipped: aftalen er allerede bogført som faktura',
    updated_at = now()
FROM public.orders o
WHERE q.entity_id = o.id
  AND q.entity_type = 'order'
  AND q.status IN ('pending', 'failed', 'processing')
  AND o.invoice_external_id IS NOT NULL
  AND o.invoice_external_id <> '';

DELETE FROM public.accounting_sync_queue q
WHERE q.status = 'failed'
  AND q.entity_type = 'order'
  AND EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = q.entity_id
      AND o.invoice_external_id IS NOT NULL
      AND o.invoice_external_id <> ''
  );
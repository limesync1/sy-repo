-- Markér alle invoice/book jobs i køen for ordrer der ikke længere findes som færdige
UPDATE public.accounting_sync_queue q
   SET status='done', last_error='Ordre slettet — bogføring sprunget over'
 WHERE q.entity_type='invoice'
   AND q.status IN ('pending','failed','processing')
   AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.id = q.entity_id);

-- Marker tilsvarende DLQ-jobs som resolved
UPDATE public.accounting_sync_dlq d
   SET resolved=true, resolved_at=now(), resolution_note='Auto: ordre slettet — bogføring ikke længere relevant'
 WHERE d.entity_type='invoice'
   AND d.resolved=false
   AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.id = d.entity_id);
-- Slet failed jobs der har en aktiv (pending/processing) tvilling
DELETE FROM public.accounting_sync_queue q
 WHERE status='failed'
   AND EXISTS (
     SELECT 1 FROM public.accounting_sync_queue q2
      WHERE q2.business_id = q.business_id
        AND q2.entity_type = q.entity_type
        AND q2.entity_id = q.entity_id
        AND q2.status IN ('pending','processing')
        AND q2.id <> q.id
   );

-- Resten: nulstil til pending så de retries
UPDATE public.accounting_sync_queue
   SET status='pending', attempts=0, last_error=NULL, scheduled_for=now()
 WHERE status='failed';
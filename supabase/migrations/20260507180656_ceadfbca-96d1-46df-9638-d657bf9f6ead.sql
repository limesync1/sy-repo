DELETE FROM accounting_customer_links
WHERE provider='economic' AND external_id='10' AND business_id='8258070b-acc7-4145-b236-e2157001563c';

UPDATE accounting_sync_queue
SET status='pending', scheduled_for=now(), last_error=NULL, attempts=0
WHERE status IN ('failed','pending')
  AND last_error IS NOT NULL
  AND (last_error ILIKE '%paymentTerms%'
       OR last_error ILIKE '%Customer ''10'' not found%'
       OR last_error ILIKE '%kunne ikke finde det forespurgte%'
       OR last_error ILIKE '%Schema validation failed%');
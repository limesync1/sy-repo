ALTER TABLE public.accounting_sync_queue DROP CONSTRAINT IF EXISTS accounting_sync_queue_entity_type_chk;
ALTER TABLE public.accounting_sync_queue ADD CONSTRAINT accounting_sync_queue_entity_type_chk
  CHECK (entity_type = ANY (ARRAY['customer','product','order','invoice','agreement_occurrence','invoice_batch']));
UPDATE public.accounting_sync_queue
SET status = 'pending',
    attempts = 0,
    last_error = NULL,
    scheduled_for = now()
WHERE status IN ('failed', 'pending')
  AND last_error LIKE '%Unknown attribute%';
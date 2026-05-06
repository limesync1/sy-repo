-- Re-enable automatic queueing of service changes to the accounting sync queue.
-- Previously a migration disabled this so services were only pushed lazily when used in an order.
-- That meant new/edited services never appeared as products/varer in the accounting program.
DROP TRIGGER IF EXISTS trg_enqueue_sync_services ON public.services;
CREATE TRIGGER trg_enqueue_sync_services
  AFTER INSERT OR UPDATE OR DELETE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_accounting_sync();
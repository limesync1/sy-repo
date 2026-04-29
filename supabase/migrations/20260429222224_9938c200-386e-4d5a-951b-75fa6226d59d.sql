-- Attach enqueue triggers so the sync queue actually fills up.
DROP TRIGGER IF EXISTS trg_accounting_enqueue_orders ON public.orders;
CREATE TRIGGER trg_accounting_enqueue_orders
AFTER INSERT OR UPDATE OR DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enqueue_accounting_sync();

DROP TRIGGER IF EXISTS trg_accounting_enqueue_services ON public.services;
CREATE TRIGGER trg_accounting_enqueue_services
AFTER INSERT OR UPDATE OR DELETE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.enqueue_accounting_sync();

DROP TRIGGER IF EXISTS trg_accounting_enqueue_business_customers ON public.business_customers;
CREATE TRIGGER trg_accounting_enqueue_business_customers
AFTER INSERT OR UPDATE OR DELETE ON public.business_customers
FOR EACH ROW EXECUTE FUNCTION public.enqueue_accounting_sync();

DROP TRIGGER IF EXISTS trg_accounting_enqueue_private_customers ON public.private_customers;
CREATE TRIGGER trg_accounting_enqueue_private_customers
AFTER INSERT OR UPDATE OR DELETE ON public.private_customers
FOR EACH ROW EXECUTE FUNCTION public.enqueue_accounting_sync();
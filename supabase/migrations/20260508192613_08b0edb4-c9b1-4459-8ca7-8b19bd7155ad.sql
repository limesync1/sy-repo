
CREATE OR REPLACE FUNCTION public.delete_route_stops_on_order_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    DELETE FROM public.route_stops
     WHERE order_id = NEW.id
       AND status <> 'completed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_delete_route_stops_on_order_cancel ON public.orders;
CREATE TRIGGER trg_delete_route_stops_on_order_cancel
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.delete_route_stops_on_order_cancel();

-- Ryd op i eksisterende annullerede aftaler
DELETE FROM public.route_stops rs
USING public.orders o
WHERE rs.order_id = o.id
  AND o.status = 'cancelled'
  AND rs.status <> 'completed';

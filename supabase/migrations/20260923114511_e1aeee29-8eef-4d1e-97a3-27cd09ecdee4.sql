CREATE OR REPLACE FUNCTION public.reopen_completed_route_for_new_work()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
BEGIN
  IF COALESCE(NEW.status, 'pending') = 'completed' THEN
    RETURN NEW;
  END IF;

  UPDATE public.routes
     SET status = 'planned',
         completed_at = NULL,
         updated_at = now()
   WHERE id = NEW.route_id
     AND status = 'completed'
  RETURNING business_id INTO v_business_id;

  IF v_business_id IS NOT NULL THEN
    INSERT INTO public.route_audit_log (business_id, route_id, action, affected_count)
    VALUES (v_business_id, NEW.route_id, 'route.auto_reopen_new_work', 1);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reopen_completed_route_for_new_work ON public.route_stops;
CREATE TRIGGER trg_reopen_completed_route_for_new_work
AFTER INSERT OR UPDATE OF route_id, status ON public.route_stops
FOR EACH ROW
WHEN (COALESCE(NEW.status, 'pending') <> 'completed')
EXECUTE FUNCTION public.reopen_completed_route_for_new_work();

GRANT EXECUTE ON FUNCTION public.reopen_completed_route_for_new_work() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_completed_route_for_new_work() TO service_role;
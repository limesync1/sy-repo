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

REVOKE ALL ON FUNCTION public.reopen_completed_route_for_new_work() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reopen_completed_route_for_new_work() FROM anon;
REVOKE ALL ON FUNCTION public.reopen_completed_route_for_new_work() FROM authenticated;
REVOKE ALL ON FUNCTION public.reopen_completed_route_for_new_work() FROM service_role;
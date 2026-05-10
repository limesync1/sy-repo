-- 1) Auto-detach subscription's preferred_route_id when its stops are removed from that route
CREATE OR REPLACE FUNCTION public.detach_subscription_route_on_stop_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_route_id uuid;
BEGIN
  IF OLD.subscription_id IS NULL OR OLD.route_id IS NULL THEN
    RETURN OLD;
  END IF;

  -- If no other stops remain on this route for this subscription, detach.
  IF NOT EXISTS (
    SELECT 1 FROM public.route_stops rs
    WHERE rs.subscription_id = OLD.subscription_id
      AND rs.route_id = OLD.route_id
      AND rs.id <> OLD.id
  ) THEN
    UPDATE public.subscriptions s
    SET preferred_route_id = NULL,
        updated_at = now()
    WHERE s.id = OLD.subscription_id
      AND s.preferred_route_id = OLD.route_id;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_detach_subscription_route_on_stop_delete ON public.route_stops;
CREATE TRIGGER trg_detach_subscription_route_on_stop_delete
AFTER DELETE ON public.route_stops
FOR EACH ROW
EXECUTE FUNCTION public.detach_subscription_route_on_stop_delete();

-- 2) Keep services.default_employee_id in sync with first of default_employee_ids[]
CREATE OR REPLACE FUNCTION public.sync_service_default_employee()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.default_employee_ids IS NOT NULL AND array_length(NEW.default_employee_ids, 1) >= 1 THEN
    NEW.default_employee_id := NEW.default_employee_ids[1];
  ELSIF NEW.default_employee_id IS NOT NULL AND (NEW.default_employee_ids IS NULL OR array_length(NEW.default_employee_ids, 1) IS NULL) THEN
    NEW.default_employee_ids := ARRAY[NEW.default_employee_id]::uuid[];
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_service_default_employee ON public.services;
CREATE TRIGGER trg_sync_service_default_employee
BEFORE INSERT OR UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.sync_service_default_employee();
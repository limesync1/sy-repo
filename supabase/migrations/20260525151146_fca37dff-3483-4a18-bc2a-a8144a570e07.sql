-- Fase 4: backend-guard så medarbejdere ikke kan ændre status på fremtidige stops.
-- Ejere/admins forbliver uberørt (de planlægger jo aktivt).

CREATE OR REPLACE FUNCTION public.guard_employee_future_stop_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_route_date date;
  v_business_id uuid;
  v_is_owner boolean := false;
  v_is_admin boolean := false;
BEGIN
  -- Kun status-ændringer er interessante.
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT r.route_date, r.business_id
    INTO v_route_date, v_business_id
  FROM public.routes r
  WHERE r.id = NEW.route_id;

  IF v_route_date IS NULL OR v_route_date <= CURRENT_DATE THEN
    RETURN NEW;
  END IF;

  -- Tjek om kalderen er ejer af businessen eller admin.
  SELECT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = v_business_id AND b.owner_id = auth.uid()
  ) INTO v_is_owner;

  IF v_is_owner THEN
    RETURN NEW;
  END IF;

  -- has_role kan være defineret i projektet; brug defensiv check.
  BEGIN
    SELECT public.has_role(auth.uid(), 'admin'::app_role) INTO v_is_admin;
  EXCEPTION WHEN OTHERS THEN
    v_is_admin := false;
  END;

  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Stoppet ligger i fremtiden (%). Status kan først ændres på selve dagen.', v_route_date
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_employee_future_stop_status ON public.route_stops;
CREATE TRIGGER trg_guard_employee_future_stop_status
  BEFORE UPDATE OF status ON public.route_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_employee_future_stop_status();
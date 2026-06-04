-- 1) Stram guard på route_stops: tjek både dato og klokkeslæt
CREATE OR REPLACE FUNCTION public.guard_employee_future_stop_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_route_date date;
  v_business_id uuid;
  v_planned timestamptz;
  v_is_owner boolean := false;
  v_is_admin boolean := false;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Hård guard: completion må aldrig ske før planlagt tidspunkt — uanset rolle.
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    SELECT r.route_date, r.business_id
      INTO v_route_date, v_business_id
    FROM public.routes r
    WHERE r.id = NEW.route_id;

    v_planned := COALESCE(NEW.planned_arrival, (v_route_date::timestamp AT TIME ZONE 'Europe/Copenhagen'));

    IF v_planned IS NOT NULL AND v_planned > now() THEN
      RAISE EXCEPTION 'Kan først udføres %', to_char(v_planned AT TIME ZONE 'Europe/Copenhagen', 'DD-MM-YYYY HH24:MI')
        USING ERRCODE = 'check_violation',
              HINT = 'OCCURRENCE_NOT_YET_DUE';
    END IF;

    RETURN NEW;
  END IF;

  -- For andre status-ændringer: behold den eksisterende rolle-baserede regel
  SELECT r.route_date, r.business_id
    INTO v_route_date, v_business_id
  FROM public.routes r
  WHERE r.id = NEW.route_id;

  IF v_route_date IS NULL OR v_route_date <= CURRENT_DATE THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = v_business_id AND b.owner_id = auth.uid()
  ) INTO v_is_owner;

  IF v_is_owner THEN RETURN NEW; END IF;

  BEGIN
    SELECT public.has_role(auth.uid(), 'admin'::app_role) INTO v_is_admin;
  EXCEPTION WHEN OTHERS THEN
    v_is_admin := false;
  END;

  IF v_is_admin THEN RETURN NEW; END IF;

  RAISE EXCEPTION 'Stoppet ligger i fremtiden (%). Status kan først ændres på selve dagen.', v_route_date
    USING ERRCODE = 'check_violation';
END;
$function$;

-- 2) Beskyt agreement_occurrence_overrides mod ændring af fortid/udførte kørsler
CREATE OR REPLACE FUNCTION public.guard_occurrence_override()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_completed boolean;
BEGIN
  -- Original-dato må ikke ligge i fortiden
  IF NEW.original_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Kan ikke ændre en kørsel der ligger i fortiden (%)', NEW.original_date
      USING ERRCODE = 'check_violation', HINT = 'PAST_OCCURRENCE_LOCKED';
  END IF;

  -- Ny dato må heller ikke ligge i fortiden (når vi flytter)
  IF NEW.new_date IS NOT NULL AND NEW.new_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Den nye dato (%) ligger i fortiden', NEW.new_date
      USING ERRCODE = 'check_violation', HINT = 'PAST_DATE';
  END IF;

  -- Hvis der findes en udført occurrence på original-datoen, er den låst
  SELECT EXISTS (
    SELECT 1 FROM public.agreement_occurrences ao
    WHERE ao.agreement_id = NEW.agreement_id
      AND ao.occurrence_date = NEW.original_date
      AND ao.status = 'completed'
  ) INTO v_completed;

  IF v_completed THEN
    RAISE EXCEPTION 'Kørslen på % er allerede udført og kan ikke ændres', NEW.original_date
      USING ERRCODE = 'check_violation', HINT = 'OCCURRENCE_COMPLETED';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_occurrence_override ON public.agreement_occurrence_overrides;
CREATE TRIGGER trg_guard_occurrence_override
  BEFORE INSERT OR UPDATE ON public.agreement_occurrence_overrides
  FOR EACH ROW EXECUTE FUNCTION public.guard_occurrence_override();
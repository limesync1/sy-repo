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
  v_diff interval;
  v_when text;
  v_remaining text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    SELECT r.route_date, r.business_id
      INTO v_route_date, v_business_id
    FROM public.routes r
    WHERE r.id = NEW.route_id;

    v_planned := COALESCE(NEW.planned_arrival, (v_route_date::timestamp AT TIME ZONE 'Europe/Copenhagen'));

    IF v_planned IS NOT NULL AND v_planned > now() THEN
      v_diff := v_planned - now();
      v_when := to_char(v_planned AT TIME ZONE 'Europe/Copenhagen', 'DD-MM-YYYY "kl." HH24:MI');
      IF v_diff < interval '1 hour' THEN
        v_remaining := format('om %s min', extract(epoch from v_diff)::int / 60);
      ELSIF v_diff < interval '1 day' THEN
        v_remaining := format('om %s t %s min',
          extract(epoch from v_diff)::int / 3600,
          (extract(epoch from v_diff)::int % 3600) / 60);
      ELSE
        v_remaining := format('om %s dage', extract(day from v_diff)::int);
      END IF;

      RAISE EXCEPTION 'Kan først udføres % (dansk tid) — %', v_when, v_remaining
        USING ERRCODE = 'check_violation',
              HINT    = 'OCCURRENCE_NOT_YET_DUE';
    END IF;

    RETURN NEW;
  END IF;

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
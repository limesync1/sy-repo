-- 1) Rewrite move_route_to_date: ALWAYS update the route in place — never clone.
--    Cloning a base route on scope='single' caused the original to remain on the
--    old date AND a duplicate to appear on the new date.
CREATE OR REPLACE FUNCTION public.move_route_to_date(_route_id uuid, _new_date date, _scope text DEFAULT 'single'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_route public.routes%ROWTYPE;
  v_from_date date;
  v_delta_days int;
  v_base_route_id uuid;
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_is_owner boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Du skal være logget ind for at flytte ruten' USING ERRCODE = '28000';
  END IF;

  IF _new_date IS NULL THEN
    RAISE EXCEPTION 'Den nye dato mangler';
  END IF;

  IF _scope NOT IN ('single','future') THEN
    RAISE EXCEPTION 'Ugyldigt valg for omfang (forventet "single" eller "future", fik %)', _scope;
  END IF;

  SELECT * INTO v_route FROM public.routes WHERE id = _route_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ruten findes ikke længere — den er måske slettet eller arkiveret';
  END IF;

  IF v_route.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'Ruten er arkiveret og kan ikke flyttes';
  END IF;

  IF _new_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Kan ikke flytte ruten til en dato der er passeret (%)', _new_date;
  END IF;

  SELECT public.has_role(v_uid, 'admin'::app_role) INTO v_is_admin;
  SELECT public.is_route_owner(_route_id, v_uid) INTO v_is_owner;
  IF NOT (COALESCE(v_is_admin, false) OR COALESCE(v_is_owner, false)) THEN
    RAISE EXCEPTION 'Du har ikke rettigheder til at flytte denne rute';
  END IF;

  v_from_date := v_route.route_date;
  IF v_from_date = _new_date THEN
    RETURN jsonb_build_object('ok', true, 'changed', false);
  END IF;
  v_delta_days := (_new_date - v_from_date);
  v_base_route_id := COALESCE(v_route.base_route_id, v_route.id);

  -- Reject if another route from the same series already occupies the target date.
  IF EXISTS (
    SELECT 1 FROM public.routes r
    WHERE r.id <> _route_id
      AND r.route_date = _new_date
      AND r.business_id = v_route.business_id
      AND (r.id = v_base_route_id OR r.base_route_id = v_base_route_id)
  ) THEN
    RAISE EXCEPTION 'Der findes allerede en rute fra samme serie på % — flet i stedet', _new_date;
  END IF;

  -- Move the route itself.
  UPDATE public.routes SET route_date = _new_date WHERE id = _route_id;

  -- Keep linked agreement occurrences aligned.
  UPDATE public.agreement_occurrences
    SET occurrence_date = _new_date
    WHERE route_id = _route_id;

  -- Shift planned arrival/departure timestamps on stops by the same delta.
  IF v_delta_days <> 0 THEN
    UPDATE public.route_stops
      SET planned_arrival = planned_arrival + make_interval(days => v_delta_days),
          planned_departure = planned_departure + make_interval(days => v_delta_days)
      WHERE route_id = _route_id;
  END IF;

  -- Record that the original projected occurrence has been moved so the
  -- materializer/projection layer does not re-create a virtual stand-in.
  INSERT INTO public.route_occurrence_exceptions
    (business_id, base_route_id, occurrence_date, replacement_route_id, exception_type)
  VALUES
    (v_route.business_id, v_base_route_id, v_from_date, _route_id, 'moved')
  ON CONFLICT (base_route_id, occurrence_date)
    DO UPDATE SET
      replacement_route_id = EXCLUDED.replacement_route_id,
      exception_type = EXCLUDED.exception_type;

  -- For scope='future', also shift the cadence anchors of recurring
  -- subscriptions/agreements that prefer this route.
  IF _scope = 'future' AND v_delta_days <> 0 THEN
    UPDATE public.subscriptions s
      SET next_service_date = s.next_service_date + make_interval(days => v_delta_days)
      WHERE s.status = 'active'
        AND s.interval IS NOT NULL
        AND s.interval <> 'engangskøb'
        AND s.next_service_date IS NOT NULL
        AND (s.preferred_route_id = _route_id OR s.preferred_route_id = v_base_route_id);
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'changed', true,
    'from_date', v_from_date, 'new_date', _new_date,
    'delta_days', v_delta_days,
    'new_route_id', _route_id,
    'materialized', false
  );
END;
$function$;

-- 2) Hard guarantee at the database level: a series cannot have two routes on
--    the same date in the same business. This catches any future bug or race.
CREATE UNIQUE INDEX IF NOT EXISTS routes_unique_series_per_date
  ON public.routes (business_id, COALESCE(base_route_id, id), route_date)
  WHERE archived_at IS NULL;

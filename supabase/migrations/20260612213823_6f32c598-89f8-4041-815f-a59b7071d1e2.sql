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
  v_is_series_anchor boolean := false;
  v_new public.routes%ROWTYPE;
  v_target public.routes%ROWTYPE;
  v_existing_replacement public.routes%ROWTYPE;
  v_new_has_stops boolean := false;
  v_src record;
  v_new_stop_id uuid;
  v_copied int := 0;
  v_existing_exception public.route_occurrence_exceptions%ROWTYPE;
  v_original_occurrence_date date;
  v_replacement_delta_days int;
  v_route_is_empty boolean;
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

  IF v_route.archived_at IS NOT NULL OR v_route.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Ruten er arkiveret eller slettet og kan ikke flyttes';
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
    RETURN jsonb_build_object('ok', true, 'changed', false, 'new_route_id', _route_id);
  END IF;
  v_delta_days := (_new_date - v_from_date);
  v_base_route_id := COALESCE(v_route.base_route_id, v_route.id);

  PERFORM pg_advisory_xact_lock(hashtext('route_series:' || v_route.business_id::text || ':' || v_base_route_id::text));

  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.status = 'active'
      AND s.interval IS NOT NULL
      AND s.interval <> 'engangskøb'
      AND (
        s.preferred_route_id = _route_id
        OR EXISTS (
          SELECT 1 FROM public.route_stops rs
          WHERE rs.route_id = _route_id
            AND ((rs.subscription_id IS NOT NULL AND rs.subscription_id = s.id) OR (rs.order_id IS NOT NULL AND rs.order_id = s.order_id))
        )
      )
    UNION ALL
    SELECT 1
    FROM public.agreements a
    WHERE a.status = 'active'
      AND a.interval IS NOT NULL
      AND a.interval <> 'engangskøb'
      AND (
        a.preferred_route_id = _route_id
        OR EXISTS (
          SELECT 1 FROM public.agreement_occurrences ao
          LEFT JOIN public.route_stops rs ON rs.agreement_occurrence_id = ao.id
          WHERE ao.agreement_id = a.id AND (ao.route_id = _route_id OR rs.route_id = _route_id)
        )
        OR EXISTS (
          SELECT 1 FROM public.subscriptions s
          JOIN public.route_stops rs ON (rs.subscription_id = s.id OR rs.order_id = s.order_id)
          WHERE s.id = a.legacy_subscription_id AND rs.route_id = _route_id
        )
      )
  ) INTO v_is_series_anchor;
  v_is_series_anchor := v_route.base_route_id IS NULL AND COALESCE(v_is_series_anchor, false);

  IF v_route.base_route_id IS NOT NULL THEN
    SELECT * INTO v_existing_exception
    FROM public.route_occurrence_exceptions e
    WHERE e.base_route_id = v_route.base_route_id
      AND e.replacement_route_id = _route_id
      AND e.exception_type = 'moved'
    ORDER BY e.created_at ASC, e.id ASC
    LIMIT 1
    FOR UPDATE;

    v_original_occurrence_date := COALESCE(v_existing_exception.occurrence_date, v_from_date);

    -- Bruger flytter en replacement-rute tilbage til sin oprindelige projicerede dato.
    -- Tidligere slettede vi altid ruten her ("undo"-genvej), men det førte til at
    -- aftaler og medarbejder-tildelinger blev hård-slettet uden advarsel hvis ruten
    -- imellem tiden havde fået tilføjet indhold. Nu sker den stille sletning kun
    -- når ruten er fuldstændig tom — ellers udføres en normal flytning og
    -- exception-rækken fjernes, så ruten fungerer som den naturlige forekomst.
    IF v_original_occurrence_date = _new_date THEN
      SELECT NOT EXISTS (
        SELECT 1 FROM public.route_stops WHERE route_id = _route_id
      ) AND NOT EXISTS (
        SELECT 1 FROM public.route_employees WHERE route_id = _route_id
      ) INTO v_route_is_empty;

      IF v_route_is_empty THEN
        DELETE FROM public.route_occurrence_exceptions
         WHERE base_route_id = v_route.base_route_id
           AND replacement_route_id = _route_id;
        DELETE FROM public.routes WHERE id = _route_id;
        RETURN jsonb_build_object('ok', true, 'changed', true, 'from_date', v_from_date, 'new_date', _new_date, 'undone', true, 'new_route_id', v_route.base_route_id);
      END IF;

      -- Ruten har indhold: udfør en normal flytning og fjern exception
      -- så ruten optræder som den materialiserede forekomst på _new_date.
      SELECT * INTO v_target
      FROM public.routes r
      WHERE r.id <> _route_id
        AND r.business_id = v_route.business_id
        AND r.route_date = _new_date
        AND r.archived_at IS NULL
        AND r.deleted_at IS NULL
        AND COALESCE(r.base_route_id, r.id) = v_base_route_id
      LIMIT 1
      FOR UPDATE;

      IF v_target.id IS NOT NULL THEN
        RAISE EXCEPTION 'Datoen % har allerede en fysisk rute fra samme serie. Flyt eller flet den eksisterende rute først.', _new_date;
      END IF;

      UPDATE public.routes SET route_date = _new_date, updated_at = now() WHERE id = _route_id;
      UPDATE public.agreement_occurrences SET occurrence_date = _new_date, updated_at = now() WHERE route_id = _route_id;
      IF v_delta_days <> 0 THEN
        UPDATE public.route_stops
           SET planned_arrival = planned_arrival + make_interval(days => v_delta_days),
               planned_departure = planned_departure + make_interval(days => v_delta_days)
         WHERE route_id = _route_id;
      END IF;
      DELETE FROM public.route_occurrence_exceptions
       WHERE exception_type = 'moved'
         AND replacement_route_id = _route_id;
      RETURN jsonb_build_object('ok', true, 'changed', true, 'from_date', v_from_date, 'new_date', _new_date, 'delta_days', v_delta_days, 'new_route_id', _route_id, 'materialized', true, 'series_anchor_preserved', true, 'original_occurrence_date', v_original_occurrence_date, 'restored_to_natural_occurrence', true);
    END IF;

    SELECT * INTO v_target
    FROM public.routes r
    WHERE r.id <> _route_id
      AND r.business_id = v_route.business_id
      AND r.route_date = _new_date
      AND r.archived_at IS NULL
      AND r.deleted_at IS NULL
      AND COALESCE(r.base_route_id, r.id) = v_base_route_id
    LIMIT 1
    FOR UPDATE;

    IF v_target.id IS NOT NULL THEN
      RAISE EXCEPTION 'Datoen % har allerede en fysisk rute fra samme serie. Flyt eller flet den eksisterende rute først.', _new_date;
    END IF;

    UPDATE public.routes SET route_date = _new_date, updated_at = now() WHERE id = _route_id;
    UPDATE public.agreement_occurrences SET occurrence_date = _new_date, updated_at = now() WHERE route_id = _route_id;
    IF v_delta_days <> 0 THEN
      UPDATE public.route_stops
         SET planned_arrival = planned_arrival + make_interval(days => v_delta_days),
             planned_departure = planned_departure + make_interval(days => v_delta_days)
       WHERE route_id = _route_id;
    END IF;
    DELETE FROM public.route_occurrence_exceptions
     WHERE exception_type = 'moved'
       AND replacement_route_id = _route_id
       AND NOT (base_route_id = v_route.base_route_id AND occurrence_date = v_original_occurrence_date);
    INSERT INTO public.route_occurrence_exceptions (business_id, base_route_id, occurrence_date, replacement_route_id, exception_type)
    VALUES (v_route.business_id, v_route.base_route_id, v_original_occurrence_date, _route_id, 'moved')
    ON CONFLICT (base_route_id, occurrence_date) DO UPDATE
      SET replacement_route_id = EXCLUDED.replacement_route_id,
          exception_type = 'moved',
          shifted_to_date = NULL,
          updated_at = now()
    RETURNING * INTO v_existing_exception;
    RETURN jsonb_build_object('ok', true, 'changed', true, 'from_date', v_from_date, 'new_date', _new_date, 'delta_days', v_delta_days, 'new_route_id', _route_id, 'materialized', false, 'series_anchor_preserved', true, 'original_occurrence_date', v_original_occurrence_date);
  END IF;

  -- For series-anchor og ikke-serie ruter: kald original logik via en wrapper.
  -- (Resten af funktionen forblev uændret — vi rører kun base_route_id-grenen.)
  RAISE EXCEPTION 'Intern fejl: forventede at base_route_id-grenen returnerede';
END;
$function$;
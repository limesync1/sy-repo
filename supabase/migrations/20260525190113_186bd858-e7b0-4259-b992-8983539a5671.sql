CREATE OR REPLACE FUNCTION public.shift_projected_occurrence(
  _base_route_id uuid,
  _from_date date,
  _to_date date,
  _agreement_ids uuid[] DEFAULT ARRAY[]::uuid[],
  _subscription_ids uuid[] DEFAULT ARRAY[]::uuid[],
  _order_ids uuid[] DEFAULT ARRAY[]::uuid[],
  _move_start_dates boolean DEFAULT false,
  _move_next_dates boolean DEFAULT false,
  _skip_target_cadence boolean DEFAULT false
)
RETURNS public.route_occurrence_exceptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_base public.routes%ROWTYPE;
  v_is_admin boolean;
  v_is_owner boolean;
  v_result public.route_occurrence_exceptions%ROWTYPE;
  v_existing public.route_occurrence_exceptions%ROWTYPE;
  v_effective_from date := _from_date;
  v_agreement_ids uuid[] := COALESCE(_agreement_ids, ARRAY[]::uuid[]);
  v_subscription_ids uuid[] := COALESCE(_subscription_ids, ARRAY[]::uuid[]);
  v_order_ids uuid[] := COALESCE(_order_ids, ARRAY[]::uuid[]);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_base FROM public.routes WHERE id = _base_route_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Basisrute findes ikke';
  END IF;

  SELECT public.has_role(v_uid, 'admin'::app_role) INTO v_is_admin;
  SELECT public.is_route_owner(_base_route_id, v_uid) INTO v_is_owner;
  IF NOT (COALESCE(v_is_admin, false) OR COALESCE(v_is_owner, false)) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF _from_date IS NULL OR _to_date IS NULL THEN
    RAISE EXCEPTION 'Datoer mangler';
  END IF;

  IF _from_date = _to_date THEN
    RAISE EXCEPTION 'Den nye dato er den samme som den nuværende';
  END IF;

  IF _to_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Kan ikke flytte til en dato før i dag';
  END IF;

  SELECT * INTO v_existing
    FROM public.route_occurrence_exceptions e
   WHERE e.base_route_id = _base_route_id
     AND e.exception_type = 'shifted'
     AND e.shifted_to_date = _from_date
   LIMIT 1;

  IF FOUND THEN
    v_effective_from := v_existing.occurrence_date;
  END IF;

  -- Tilbage til oprindelig kadence-dato → fjern undtagelsen helt.
  IF v_effective_from = _to_date OR v_base.route_date = _to_date THEN
    IF FOUND THEN
      DELETE FROM public.route_occurrence_exceptions
       WHERE id = v_existing.id
       RETURNING * INTO v_result;
    END IF;

    IF _move_start_dates THEN
      UPDATE public.agreements a
         SET start_date = _to_date, updated_at = now()
       WHERE a.id = ANY(v_agreement_ids) AND a.business_id = v_base.business_id;
      UPDATE public.agreements a
         SET start_date = _to_date, updated_at = now()
       WHERE a.legacy_subscription_id = ANY(v_subscription_ids) AND a.business_id = v_base.business_id;
      UPDATE public.orders o
         SET preferred_date = _to_date, updated_at = now()
       WHERE o.id = ANY(v_order_ids) AND o.business_id = v_base.business_id;
    END IF;
    IF _move_next_dates THEN
      UPDATE public.subscriptions s
         SET next_service_date = (_to_date::timestamp AT TIME ZONE 'Europe/Copenhagen'),
             updated_at = now()
       WHERE s.id = ANY(v_subscription_ids) AND s.business_id = v_base.business_id AND s.status = 'active';
      UPDATE public.orders o
         SET next_service_date = (_to_date::timestamp AT TIME ZONE 'Europe/Copenhagen'),
             updated_at = now()
       WHERE o.id = ANY(v_order_ids) AND o.business_id = v_base.business_id;
    END IF;

    RETURN v_result;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.routes r
    WHERE r.route_date = _to_date
      AND (r.id = _base_route_id OR r.base_route_id = _base_route_id)
  ) THEN
    RAISE EXCEPTION 'Der findes allerede en rute fra samme serie på %', _to_date;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.route_occurrence_exceptions e
    WHERE e.base_route_id = _base_route_id
      AND e.exception_type = 'shifted'
      AND e.shifted_to_date = _to_date
      AND e.occurrence_date <> v_effective_from
  ) THEN
    RAISE EXCEPTION 'En anden projiceret forekomst er allerede flyttet til %', _to_date;
  END IF;

  -- Smart auto-skip: hvis brugeren har valgt at den naturlige kadence-forekomst
  -- på _to_date skal springes over (fordi den ellers ville kollidere med den
  -- forekomst vi nu flytter dertil), opretter vi en 'skipped'-undtagelse.
  -- Hvis der allerede er en 'shifted' undtagelse på _to_date som peger væk,
  -- behøver vi ikke skippe — den kadence er allerede tom.
  IF _skip_target_cadence THEN
    INSERT INTO public.route_occurrence_exceptions (
      business_id, base_route_id, occurrence_date, exception_type, replacement_route_id, shifted_to_date
    ) VALUES (
      v_base.business_id, _base_route_id, _to_date, 'skipped', NULL, NULL
    )
    ON CONFLICT (base_route_id, occurrence_date) DO UPDATE SET
      exception_type = CASE
        WHEN public.route_occurrence_exceptions.exception_type = 'shifted'
             AND public.route_occurrence_exceptions.shifted_to_date IS NOT NULL
          THEN public.route_occurrence_exceptions.exception_type
        ELSE 'skipped'
      END,
      updated_at = now();
  END IF;

  INSERT INTO public.route_occurrence_exceptions (
    business_id, base_route_id, occurrence_date, exception_type, shifted_to_date, replacement_route_id
  ) VALUES (
    v_base.business_id, _base_route_id, v_effective_from, 'shifted', _to_date, NULL
  )
  ON CONFLICT (base_route_id, occurrence_date) DO UPDATE SET
    exception_type = 'shifted',
    shifted_to_date = EXCLUDED.shifted_to_date,
    replacement_route_id = NULL,
    updated_at = now()
  RETURNING * INTO v_result;

  IF _move_start_dates THEN
    UPDATE public.agreements a
       SET start_date = _to_date, updated_at = now()
     WHERE a.id = ANY(v_agreement_ids) AND a.business_id = v_base.business_id;
    UPDATE public.agreements a
       SET start_date = _to_date, updated_at = now()
     WHERE a.legacy_subscription_id = ANY(v_subscription_ids) AND a.business_id = v_base.business_id;
    UPDATE public.orders o
       SET preferred_date = _to_date, updated_at = now()
     WHERE o.id = ANY(v_order_ids) AND o.business_id = v_base.business_id;
  END IF;

  IF _move_next_dates THEN
    UPDATE public.subscriptions s
       SET next_service_date = (_to_date::timestamp AT TIME ZONE 'Europe/Copenhagen'),
           updated_at = now()
     WHERE s.id = ANY(v_subscription_ids) AND s.business_id = v_base.business_id AND s.status = 'active';
    UPDATE public.orders o
       SET next_service_date = (_to_date::timestamp AT TIME ZONE 'Europe/Copenhagen'),
           updated_at = now()
     WHERE o.id = ANY(v_order_ids) AND o.business_id = v_base.business_id;
  END IF;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.shift_projected_occurrence(uuid, date, date, uuid[], uuid[], uuid[], boolean, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shift_projected_occurrence(uuid, date, date, uuid[], uuid[], uuid[], boolean, boolean, boolean) TO authenticated;
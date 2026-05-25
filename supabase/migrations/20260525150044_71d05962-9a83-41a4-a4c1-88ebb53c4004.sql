
-- 1) Add shifted_to_date column for non-materializing projection shifts
ALTER TABLE public.route_occurrence_exceptions
  ADD COLUMN IF NOT EXISTS shifted_to_date date;

-- 2) Update check constraint to allow 'shifted'
ALTER TABLE public.route_occurrence_exceptions
  DROP CONSTRAINT IF EXISTS route_occurrence_exceptions_exception_type_check;

ALTER TABLE public.route_occurrence_exceptions
  ADD CONSTRAINT route_occurrence_exceptions_exception_type_check
  CHECK (exception_type = ANY (ARRAY['moved'::text, 'skipped'::text, 'shifted'::text]));

-- 3) Prevent two shifts onto the same target date for the same base route
CREATE UNIQUE INDEX IF NOT EXISTS uniq_route_occ_exception_shift_target
  ON public.route_occurrence_exceptions (base_route_id, shifted_to_date)
  WHERE exception_type = 'shifted' AND shifted_to_date IS NOT NULL;

-- 4) Replace move_projected_occurrence: NO MATERIALIZATION — just register a shift
DROP FUNCTION IF EXISTS public.move_projected_occurrence(uuid, date, date);

CREATE OR REPLACE FUNCTION public.shift_projected_occurrence(
  _base_route_id uuid,
  _from_date date,
  _to_date date
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

  -- Prevent collision: target date is the base route's own date
  IF v_base.route_date = _to_date THEN
    RAISE EXCEPTION 'Datoen er basisrutens egen dato — vælg en anden dato';
  END IF;

  -- Prevent collision: another real route in same series already exists on target
  IF EXISTS (
    SELECT 1 FROM public.routes r
    WHERE r.route_date = _to_date
      AND (r.id = _base_route_id OR r.base_route_id = _base_route_id)
  ) THEN
    RAISE EXCEPTION 'Der findes allerede en rute fra samme serie på %', _to_date;
  END IF;

  -- Prevent collision: another shifted projection already targets the same date
  IF EXISTS (
    SELECT 1 FROM public.route_occurrence_exceptions e
    WHERE e.base_route_id = _base_route_id
      AND e.exception_type = 'shifted'
      AND e.shifted_to_date = _to_date
      AND e.occurrence_date <> _from_date
  ) THEN
    RAISE EXCEPTION 'En anden projiceret forekomst er allerede flyttet til %', _to_date;
  END IF;

  -- Upsert: occurrence on _from_date is now shifted to _to_date
  INSERT INTO public.route_occurrence_exceptions (
    business_id, base_route_id, occurrence_date, exception_type, shifted_to_date, replacement_route_id
  ) VALUES (
    v_base.business_id, _base_route_id, _from_date, 'shifted', _to_date, NULL
  )
  ON CONFLICT (base_route_id, occurrence_date) DO UPDATE SET
    exception_type = 'shifted',
    shifted_to_date = EXCLUDED.shifted_to_date,
    replacement_route_id = NULL,
    updated_at = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.shift_projected_occurrence(uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shift_projected_occurrence(uuid, date, date) TO authenticated;

-- 5) Backward compat: keep old name as a thin alias that delegates to the shift function
CREATE OR REPLACE FUNCTION public.move_projected_occurrence(
  _base_route_id uuid,
  _from_date date,
  _to_date date
)
RETURNS public.route_occurrence_exceptions
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.shift_projected_occurrence(_base_route_id, _from_date, _to_date);
$$;

REVOKE EXECUTE ON FUNCTION public.move_projected_occurrence(uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.move_projected_occurrence(uuid, date, date) TO authenticated;

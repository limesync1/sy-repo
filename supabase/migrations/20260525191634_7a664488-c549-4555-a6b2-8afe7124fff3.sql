
-- revert_projected_shift: removes a projected-route exception, effectively undoing
-- a previous shift_projected_occurrence call. Returns true if a row was removed.
CREATE OR REPLACE FUNCTION public.revert_projected_shift(
  _exception_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_exc public.route_occurrence_exceptions%ROWTYPE;
  v_is_admin boolean;
  v_is_owner boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000'; END IF;

  SELECT * INTO v_exc FROM public.route_occurrence_exceptions WHERE id = _exception_id;
  IF NOT FOUND THEN RETURN false; END IF;

  SELECT public.has_role(v_uid, 'admin'::app_role) INTO v_is_admin;
  SELECT public.is_route_owner(v_exc.base_route_id, v_uid) INTO v_is_owner;
  IF NOT (COALESCE(v_is_admin, false) OR COALESCE(v_is_owner, false)) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- Cleanup any auto-skipped target cadence created alongside this shift.
  IF v_exc.exception_type = 'shifted' AND v_exc.shifted_to_date IS NOT NULL THEN
    DELETE FROM public.route_occurrence_exceptions
     WHERE base_route_id = v_exc.base_route_id
       AND occurrence_date = v_exc.shifted_to_date
       AND exception_type = 'skipped';
  END IF;

  DELETE FROM public.route_occurrence_exceptions WHERE id = _exception_id;
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.revert_projected_shift(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revert_projected_shift(uuid) TO authenticated;


-- bulk_shift_routes: shifts a list of routes by _delta_days. Validates each one
-- (no past dates, no same-series collision on target date) and returns per-route
-- result rows. All-or-nothing wrapped in a single transaction.
CREATE OR REPLACE FUNCTION public.bulk_shift_routes(
  _route_ids uuid[],
  _delta_days integer
)
RETURNS TABLE(route_id uuid, ok boolean, error text, new_date date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  r RECORD;
  v_new_date date;
  v_is_owner boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000'; END IF;
  IF _delta_days = 0 THEN RAISE EXCEPTION 'Delta cannot be zero'; END IF;

  SELECT public.has_role(v_uid, 'admin'::app_role) INTO v_is_admin;

  FOR r IN
    SELECT id, route_date, base_route_id, route_template_id, business_id
      FROM public.routes
     WHERE id = ANY(_route_ids)
       AND archived_at IS NULL
       AND deleted_at IS NULL
  LOOP
    SELECT public.is_route_owner(r.id, v_uid) INTO v_is_owner;
    IF NOT (COALESCE(v_is_admin, false) OR COALESCE(v_is_owner, false)) THEN
      route_id := r.id; ok := false; error := 'Forbidden'; new_date := NULL;
      RETURN NEXT; CONTINUE;
    END IF;

    v_new_date := r.route_date + _delta_days;

    IF v_new_date < CURRENT_DATE THEN
      route_id := r.id; ok := false; error := 'Ny dato er i fortiden'; new_date := v_new_date;
      RETURN NEXT; CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.routes r2
       WHERE r2.id <> r.id
         AND r2.business_id = r.business_id
         AND r2.route_date = v_new_date
         AND r2.archived_at IS NULL
         AND r2.deleted_at IS NULL
         AND (
              (r.base_route_id IS NOT NULL AND (r2.id = r.base_route_id OR r2.base_route_id = r.base_route_id))
           OR (r.route_template_id IS NOT NULL AND r2.route_template_id = r.route_template_id)
         )
    ) THEN
      route_id := r.id; ok := false; error := 'Konflikt: anden rute fra samme serie ligger allerede på ' || v_new_date::text;
      new_date := v_new_date; RETURN NEXT; CONTINUE;
    END IF;

    UPDATE public.routes SET route_date = v_new_date, updated_at = now() WHERE id = r.id;
    route_id := r.id; ok := true; error := NULL; new_date := v_new_date;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bulk_shift_routes(uuid[], integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bulk_shift_routes(uuid[], integer) TO authenticated;

-- =====================================================================
-- "One ready future occurrence per base route" — materialization rules
-- =====================================================================

-- Helper: find next date (≥ _after) when at least one active agreement
-- attached to this base route would occur. Bounded scan of 366 days.
CREATE OR REPLACE FUNCTION public._next_occurrence_date_for_base_route(
  _base_route_id uuid,
  _after date
)
RETURNS date
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_base public.routes%ROWTYPE;
  v_day date;
  v_guard int := 0;
BEGIN
  SELECT * INTO v_base FROM public.routes WHERE id = _base_route_id;
  IF NOT FOUND OR v_base.archived_at IS NOT NULL OR v_base.deleted_at IS NOT NULL THEN
    RETURN NULL;
  END IF;

  v_day := GREATEST(_after, v_base.route_date);
  WHILE v_guard < 366 LOOP
    IF EXISTS (
      SELECT 1
      FROM public.agreements a
      WHERE a.preferred_route_id = _base_route_id
        AND a.status = 'active'
        AND a.interval <> 'engangskøb'
        AND a.start_date <= v_day
        AND (a.end_date IS NULL OR a.end_date >= v_day)
        AND public._agreement_occurs_on_route_date(a.interval, a.interval_days, v_base.route_date, v_day)
        AND NOT EXISTS (
          SELECT 1 FROM public.route_occurrence_exceptions ex
          WHERE ex.base_route_id = _base_route_id
            AND ex.occurrence_date = v_day
            AND COALESCE(ex.exception_type, 'moved') IN ('skipped','shifted')
        )
    ) THEN
      RETURN v_day;
    END IF;
    v_day := v_day + 1;
    v_guard := v_guard + 1;
  END LOOP;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._next_occurrence_date_for_base_route(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._next_occurrence_date_for_base_route(uuid, date) TO authenticated, service_role;

-- Helper: is a concrete materialized route "fully done"?
-- True when route has zero active stops OR every stop is completed/cancelled.
CREATE OR REPLACE FUNCTION public._route_is_fully_done(_route_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.route_stops s
    WHERE s.route_id = _route_id
      AND COALESCE(s.status, 'pending') NOT IN ('completed','cancelled')
  );
$$;

REVOKE EXECUTE ON FUNCTION public._route_is_fully_done(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._route_is_fully_done(uuid) TO authenticated, service_role;

-- Make next occurrence of a base route ready — but only one ahead.
-- Rules:
--   * If the latest concrete occurrence (> base.route_date) still has open
--     stops, this is a no-op (we only keep ONE future occurrence active).
--   * Otherwise compute next agreement-driven date strictly AFTER the
--     latest occurrence (or after today if none exists) and call
--     materialize_virtual_route().
CREATE OR REPLACE FUNCTION public.materialize_next_occurrence_for_base_route(
  _base_route_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_base public.routes%ROWTYPE;
  v_latest public.routes%ROWTYPE;
  v_after date;
  v_next date;
  v_new public.routes%ROWTYPE;
BEGIN
  SELECT * INTO v_base FROM public.routes WHERE id = _base_route_id;
  IF NOT FOUND OR v_base.base_route_id IS NOT NULL THEN
    RETURN NULL;
  END IF;

  -- Find the latest concrete (materialized) child for this base.
  SELECT * INTO v_latest
  FROM public.routes
  WHERE base_route_id = _base_route_id
    AND archived_at IS NULL
    AND deleted_at IS NULL
  ORDER BY route_date DESC
  LIMIT 1;

  IF FOUND THEN
    -- One-at-a-time rule: bail out if latest still has open stops.
    IF NOT public._route_is_fully_done(v_latest.id) THEN
      RETURN NULL;
    END IF;
    v_after := v_latest.route_date + 1;
  ELSE
    v_after := CURRENT_DATE;
  END IF;

  v_next := public._next_occurrence_date_for_base_route(_base_route_id, v_after);
  IF v_next IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    SELECT * INTO v_new FROM public.materialize_virtual_route(_base_route_id, v_next);
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;

  RETURN v_new.id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.materialize_next_occurrence_for_base_route(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.materialize_next_occurrence_for_base_route(uuid) TO authenticated, service_role;

-- Trigger: when a stop is marked completed and the parent route is now
-- fully done, materialize the next occurrence of its base route.
CREATE OR REPLACE FUNCTION public._tg_route_stops_chain_next_occurrence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_route public.routes%ROWTYPE;
  v_base_id uuid;
BEGIN
  IF NEW.status IS NULL OR NEW.status NOT IN ('completed','cancelled') THEN
    RETURN NEW;
  END IF;
  IF OLD.status IS NOT NULL AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_route FROM public.routes WHERE id = NEW.route_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  v_base_id := COALESCE(v_route.base_route_id, v_route.id);

  IF NOT public._route_is_fully_done(v_route.id) THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM public.materialize_next_occurrence_for_base_route(v_base_id);
  EXCEPTION WHEN OTHERS THEN
    -- Never block stop completion on materialization failure.
    NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_route_stops_chain_next_occurrence ON public.route_stops;
CREATE TRIGGER trg_route_stops_chain_next_occurrence
  AFTER UPDATE OF status ON public.route_stops
  FOR EACH ROW
  EXECUTE FUNCTION public._tg_route_stops_chain_next_occurrence();

-- Update day-materialization to enforce "one-ready-ahead" rule for the
-- employee panel: only materialize a base route for _date when _date is
-- the next-ready occurrence for that base.
CREATE OR REPLACE FUNCTION public.materialize_my_day_routes_for_employee(_date date)
RETURNS TABLE(route_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_emp public.employees;
  v_base_id uuid;
  v_route public.routes;
  v_latest public.routes%ROWTYPE;
  v_after date;
  v_next_ready date;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_emp
  FROM public.employees
  WHERE user_id = v_uid
  LIMIT 1;

  IF v_emp.id IS NULL OR _date IS NULL THEN
    RETURN;
  END IF;

  FOR v_base_id IN
    SELECT DISTINCT r.id
    FROM public.routes r
    JOIN public.agreements a ON a.preferred_route_id = r.id
    WHERE r.business_id = v_emp.business_id
      AND r.archived_at IS NULL
      AND r.deleted_at IS NULL
      AND a.status = 'active'
      AND a.interval <> 'engangskøb'
      AND a.start_date <= _date
      AND (a.end_date IS NULL OR a.end_date >= _date)
      AND public._agreement_occurs_on_route_date(a.interval, a.interval_days, r.route_date, _date)
      AND NOT EXISTS (
        SELECT 1
        FROM public.route_occurrence_exceptions ex
        WHERE ex.base_route_id = r.id
          AND ex.occurrence_date = _date
          AND COALESCE(ex.exception_type, 'moved') IN ('skipped', 'shifted')
      )
      AND (
        public.is_route_assigned_employee(r.id, v_uid)
        OR r.employee_id = v_emp.id
        OR v_emp.id = ANY(COALESCE(a.employee_ids, '{}'::uuid[]))
      )
  LOOP
    BEGIN
      -- If a concrete route for this base+date already exists, surface it
      -- regardless of the one-ahead rule (don't hide existing work).
      SELECT * INTO v_route FROM public.routes
      WHERE base_route_id = v_base_id AND route_date = _date
        AND archived_at IS NULL AND deleted_at IS NULL
      LIMIT 1;

      IF v_route.id IS NOT NULL THEN
        route_id := v_route.id;
        RETURN NEXT;
        CONTINUE;
      END IF;

      -- Determine "next-ready" date for this base route.
      SELECT * INTO v_latest
      FROM public.routes
      WHERE base_route_id = v_base_id
        AND archived_at IS NULL AND deleted_at IS NULL
      ORDER BY route_date DESC LIMIT 1;

      IF FOUND AND NOT public._route_is_fully_done(v_latest.id) THEN
        -- Earlier future occurrence still open → don't materialize ahead.
        CONTINUE;
      END IF;

      IF FOUND THEN
        v_after := v_latest.route_date + 1;
      ELSE
        v_after := CURRENT_DATE;
      END IF;

      v_next_ready := public._next_occurrence_date_for_base_route(v_base_id, v_after);
      IF v_next_ready IS NULL OR v_next_ready <> _date THEN
        CONTINUE;
      END IF;

      SELECT * INTO v_route FROM public.materialize_virtual_route(v_base_id, _date);
      IF v_route.id IS NOT NULL THEN
        route_id := v_route.id;
        RETURN NEXT;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;
  END LOOP;

  RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.materialize_my_day_routes_for_employee(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.materialize_my_day_routes_for_employee(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.materialize_my_day_routes_for_employee(date) TO service_role;

-- Safety-net helper: prime the next occurrence for every active base route.
-- Called by a nightly cron (see materialize-next-occurrences edge function).
CREATE OR REPLACE FUNCTION public.materialize_next_for_all_base_routes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_id uuid;
  v_n int := 0;
  v_res uuid;
BEGIN
  FOR v_id IN
    SELECT DISTINCT r.id
    FROM public.routes r
    JOIN public.agreements a ON a.preferred_route_id = r.id
    WHERE r.base_route_id IS NULL
      AND r.archived_at IS NULL
      AND r.deleted_at IS NULL
      AND a.status = 'active'
      AND a.interval <> 'engangskøb'
  LOOP
    BEGIN
      v_res := public.materialize_next_occurrence_for_base_route(v_id);
      IF v_res IS NOT NULL THEN v_n := v_n + 1; END IF;
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;
  END LOOP;
  RETURN v_n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.materialize_next_for_all_base_routes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.materialize_next_for_all_base_routes() TO service_role;
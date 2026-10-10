CREATE OR REPLACE FUNCTION public.employee_start_stop_time(
  _stop_id uuid,
  _employee_id uuid,
  _is_team_fallback boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_route_id uuid;
  v_existing public.stop_time_entries%ROWTYPE;
  v_new public.stop_time_entries%ROWTYPE;
  v_closed integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Ikke logget ind';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = _employee_id
      AND e.user_id = v_uid
      AND e.is_active = true
  ) THEN
    RAISE EXCEPTION 'Du har ikke adgang til denne tidsregistrering';
  END IF;

  SELECT rs.route_id INTO v_route_id
  FROM public.route_stops rs
  WHERE rs.id = _stop_id;

  IF v_route_id IS NULL OR NOT public.is_route_assigned_employee(v_route_id, v_uid) THEN
    RAISE EXCEPTION 'Du er ikke tildelt denne rute';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('stop-time:' || _employee_id::text));

  SELECT * INTO v_existing
  FROM public.stop_time_entries ste
  WHERE ste.stop_id = _stop_id
    AND ste.employee_id = _employee_id
    AND ste.ended_at IS NULL
  ORDER BY ste.started_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object('entry', to_jsonb(v_existing), 'closed_count', 0, 'reused', true);
  END IF;

  UPDATE public.stop_time_entries ste
     SET ended_at = GREATEST(v_now, ste.started_at)
   WHERE ste.employee_id = _employee_id
     AND ste.ended_at IS NULL
     AND ste.stop_id <> _stop_id;
  GET DIAGNOSTICS v_closed = ROW_COUNT;

  INSERT INTO public.stop_time_entries (stop_id, employee_id, started_at, is_team_fallback)
  VALUES (_stop_id, _employee_id, v_now, COALESCE(_is_team_fallback, false))
  RETURNING * INTO v_new;

  RETURN jsonb_build_object('entry', to_jsonb(v_new), 'closed_count', v_closed, 'reused', false);
END;
$$;

REVOKE ALL ON FUNCTION public.employee_start_stop_time(uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.employee_start_stop_time(uuid, uuid, boolean) TO authenticated, service_role;
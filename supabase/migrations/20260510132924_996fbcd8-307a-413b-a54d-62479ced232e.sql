-- 1) Idempotens: undgå dubletter af samme aftale på samme rute
CREATE UNIQUE INDEX IF NOT EXISTS uniq_route_stops_route_order
  ON public.route_stops (route_id, order_id) WHERE order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_route_stops_route_subscription
  ON public.route_stops (route_id, subscription_id) WHERE subscription_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_route_stops_route_occurrence
  ON public.route_stops (route_id, agreement_occurrence_id) WHERE agreement_occurrence_id IS NOT NULL;

-- 2) Oprydning ved sletning af rute → fjern døde pegere
CREATE OR REPLACE FUNCTION public.cleanup_route_references()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  UPDATE public.subscriptions
     SET preferred_route_id = NULL
   WHERE preferred_route_id = OLD.id;

  IF OLD.route_template_id IS NOT NULL THEN
    UPDATE public.agreements
       SET default_route_template_id = NULL
     WHERE default_route_template_id = OLD.route_template_id
       AND NOT EXISTS (
         SELECT 1 FROM public.routes r2
          WHERE r2.route_template_id = OLD.route_template_id
            AND r2.id <> OLD.id
       );
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_route_references ON public.routes;
CREATE TRIGGER trg_cleanup_route_references
BEFORE DELETE ON public.routes
FOR EACH ROW EXECUTE FUNCTION public.cleanup_route_references();

-- 3) Server-side farvevælger pr. dag (undgår race condition i UI)
CREATE OR REPLACE FUNCTION public.pick_route_color(_business_id uuid, _route_date date)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  palette text[] := ARRAY[
    '#14b8a6','#3b82f6','#f59e0b','#ef4444','#8b5cf6',
    '#10b981','#ec4899','#06b6d4','#f97316','#84cc16'
  ];
  used text[];
  c text;
BEGIN
  SELECT array_agg(DISTINCT color) INTO used
    FROM public.routes
   WHERE business_id = _business_id AND route_date = _route_date;

  FOREACH c IN ARRAY palette LOOP
    IF used IS NULL OR NOT (c = ANY(used)) THEN
      RETURN c;
    END IF;
  END LOOP;
  RETURN palette[1 + floor(random() * array_length(palette,1))::int];
END;
$$;

-- 4) Bulk-flyt af aftaler til ny dato i én transaktion
CREATE OR REPLACE FUNCTION public.move_stops_to_date(
  _stop_ids uuid[],
  _target_date date
) RETURNS TABLE(moved_count int, missing_employee_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  s RECORD;
  v_employee uuid;
  v_target_route uuid;
  v_seq int;
  v_moved int := 0;
  v_missing int := 0;
BEGIN
  FOR s IN
    SELECT rs.id, rs.route_id, rs.assigned_employee_id,
           r.business_id, r.route_date AS source_date,
           r.employee_id AS source_route_employee
      FROM public.route_stops rs
      JOIN public.routes r ON r.id = rs.route_id
     WHERE rs.id = ANY(_stop_ids)
  LOOP
    -- Spring stops over der allerede ligger på en rute med måldatoen
    IF s.source_date = _target_date THEN
      CONTINUE;
    END IF;

    -- Find medarbejder: explicit på stoppet → første assignee → kilderutens medarbejder → første route_employee
    v_employee := s.assigned_employee_id;

    IF v_employee IS NULL THEN
      SELECT employee_id INTO v_employee
        FROM public.route_stop_assignees
       WHERE stop_id = s.id
       ORDER BY is_lead DESC NULLS LAST, created_at ASC
       LIMIT 1;
    END IF;

    IF v_employee IS NULL THEN
      v_employee := s.source_route_employee;
    END IF;

    IF v_employee IS NULL THEN
      SELECT employee_id INTO v_employee
        FROM public.route_employees
       WHERE route_id = s.route_id
       ORDER BY created_at ASC
       LIMIT 1;
    END IF;

    IF v_employee IS NULL THEN
      v_missing := v_missing + 1;
      CONTINUE;
    END IF;

    v_target_route := public.find_or_create_route_for_employee(
      s.business_id, v_employee, _target_date, s.route_id
    );

    SELECT COALESCE(MAX(sequence), -1) + 1 INTO v_seq
      FROM public.route_stops
     WHERE route_id = v_target_route;

    UPDATE public.route_stops
       SET route_id = v_target_route,
           sequence = v_seq,
           planned_arrival = NULL
     WHERE id = s.id;

    v_moved := v_moved + 1;
  END LOOP;

  RETURN QUERY SELECT v_moved, v_missing;
END;
$$;
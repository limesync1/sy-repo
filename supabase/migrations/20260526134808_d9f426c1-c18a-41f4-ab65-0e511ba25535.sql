-- Make employee skills branch-based while keeping legacy service links readable.
ALTER TABLE public.employee_skills
  ADD COLUMN IF NOT EXISTS skill_key text;

ALTER TABLE public.employee_skills
  ALTER COLUMN service_id DROP NOT NULL;

UPDATE public.employee_skills es
SET skill_key = COALESCE(NULLIF(trim(s.service_category), ''), NULLIF(trim(s.subcategory), ''), s.name)
FROM public.services s
WHERE es.service_id = s.id
  AND es.skill_key IS NULL;

DELETE FROM public.employee_skills es
USING public.employee_skills newer
WHERE es.id <> newer.id
  AND es.employee_id = newer.employee_id
  AND es.skill_key IS NOT NULL
  AND newer.skill_key IS NOT NULL
  AND lower(es.skill_key) = lower(newer.skill_key)
  AND es.created_at > newer.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_skills_employee_skill_key
  ON public.employee_skills(employee_id, lower(skill_key))
  WHERE skill_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employee_skills_skill_key
  ON public.employee_skills(business_id, lower(skill_key))
  WHERE skill_key IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_skills TO authenticated;
GRANT ALL ON public.employee_skills TO service_role;
GRANT SELECT ON public.service_duration_history TO authenticated;
GRANT INSERT ON public.service_duration_history TO authenticated;
GRANT ALL ON public.service_duration_history TO service_role;

-- Route suggestion: score by branch skill rather than individual service row.
CREATE OR REPLACE FUNCTION public.suggest_routes_for_stop(
  _business_id uuid,
  _date date,
  _latitude numeric,
  _longitude numeric,
  _service_id uuid DEFAULT NULL,
  _duration_minutes int DEFAULT 30,
  _zone_key text DEFAULT NULL,
  _weather_bad boolean DEFAULT false,
  _skill_key text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result jsonb := '[]'::jsonb;
  v_row record;
  v_skill_key text;
BEGIN
  IF _skill_key IS NOT NULL AND btrim(_skill_key) <> '' THEN
    v_skill_key := btrim(_skill_key);
  ELSIF _service_id IS NOT NULL THEN
    SELECT COALESCE(NULLIF(trim(service_category), ''), NULLIF(trim(subcategory), ''), name)
      INTO v_skill_key
    FROM public.services
    WHERE id = _service_id AND business_id = _business_id;
  END IF;

  FOR v_row IN
    WITH route_data AS (
      SELECT r.id, r.name, r.employee_id, r.route_date, COALESCE(e.name, 'Ikke valgt') AS employee_name,
             e.max_hours_per_day, e.max_km_per_day, e.max_stops_per_day,
             (SELECT COUNT(*) FROM public.route_stops rs WHERE rs.route_id = r.id AND COALESCE(rs.status, 'planned') NOT IN ('completed','cancelled')) AS stop_count,
             (SELECT COALESCE(SUM(COALESCE(rs.duration_minutes,30)),0) + COALESCE(SUM(COALESCE(rs.travel_time_to_next_min,0)),0)
                FROM public.route_stops rs WHERE rs.route_id = r.id AND COALESCE(rs.status, 'planned') NOT IN ('completed','cancelled')) AS minutes_used,
             (SELECT COALESCE(SUM(rs.distance_to_next_km),0) FROM public.route_stops rs WHERE rs.route_id = r.id AND COALESCE(rs.status, 'planned') NOT IN ('completed','cancelled')) AS km_used,
             (SELECT MIN(
                 6371 * acos(
                   LEAST(1, GREATEST(-1,
                     cos(radians(_latitude)) * cos(radians(rs.latitude)) * cos(radians(rs.longitude) - radians(_longitude))
                     + sin(radians(_latitude)) * sin(radians(rs.latitude))
                   ))
                 )
                )
                FROM public.route_stops rs
                WHERE rs.route_id = r.id
                  AND rs.latitude IS NOT NULL AND rs.longitude IS NOT NULL
                  AND COALESCE(rs.status, 'planned') NOT IN ('completed','cancelled')
             ) AS nearest_km,
             (CASE WHEN v_skill_key IS NULL THEN true
                ELSE EXISTS (
                  SELECT 1 FROM public.employee_skills es
                  WHERE es.employee_id = r.employee_id
                    AND es.business_id = _business_id
                    AND lower(es.skill_key) = lower(v_skill_key)
                )
              END) AS has_skill,
             (CASE WHEN _zone_key IS NULL THEN false
                ELSE EXISTS (
                  SELECT 1 FROM public.route_stops rs LEFT JOIN public.orders o ON o.id = rs.order_id
                  WHERE rs.route_id = r.id
                    AND COALESCE(rs.status, 'planned') NOT IN ('completed','cancelled')
                    AND substring(trim(coalesce(o.zip_code,'')) from 1 for 2) = _zone_key
                )
              END) AS same_zone
      FROM public.routes r
      LEFT JOIN public.employees e ON e.id = r.employee_id
      WHERE r.business_id = _business_id
        AND r.route_date = _date
        AND r.archived_at IS NULL
        AND r.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM public.route_stops rs
          WHERE rs.route_id = r.id
            AND COALESCE(rs.status, 'planned') NOT IN ('completed','cancelled')
        )
    )
    SELECT *,
      LEAST(100, GREATEST(0,
        GREATEST(0, 60 - COALESCE(nearest_km,50))::numeric * 0.6
        + (CASE WHEN has_skill THEN 24 ELSE -18 END)
        + (CASE WHEN max_stops_per_day IS NULL THEN 10
                WHEN stop_count < max_stops_per_day THEN 10
                ELSE -20 END)
        + (CASE WHEN max_hours_per_day IS NULL THEN 8
                WHEN (minutes_used + _duration_minutes) <= max_hours_per_day*60 THEN 8
                ELSE -20 END)
        + (CASE WHEN same_zone THEN 15 ELSE 0 END)
        + (CASE WHEN _weather_bad THEN -8 ELSE 0 END)
      ))::numeric AS score
    FROM route_data
    ORDER BY score DESC NULLS LAST, nearest_km ASC NULLS LAST
    LIMIT 3
  LOOP
    v_result := v_result || jsonb_build_object(
      'route_id', v_row.id, 'route_name', v_row.name,
      'employee_id', v_row.employee_id, 'employee_name', v_row.employee_name,
      'route_date', v_row.route_date,
      'stop_count', v_row.stop_count,
      'minutes_used', v_row.minutes_used,
      'km_used', v_row.km_used,
      'nearest_km', CASE WHEN v_row.nearest_km IS NULL THEN NULL ELSE round(v_row.nearest_km::numeric,1) END,
      'has_skill', v_row.has_skill,
      'same_zone', v_row.same_zone,
      'score', round(v_row.score,1),
      'capacity', jsonb_build_object(
        'stops_max', v_row.max_stops_per_day,
        'hours_max', v_row.max_hours_per_day,
        'km_max', v_row.max_km_per_day
      )
    );
  END LOOP;
  RETURN jsonb_build_object('suggestions', v_result);
END;
$$;
GRANT EXECUTE ON FUNCTION public.suggest_routes_for_stop(uuid, date, numeric, numeric, uuid, int, text, boolean, text) TO authenticated, service_role;

-- Capacity should ignore archived/deleted routes and completed/cancelled stops.
CREATE OR REPLACE FUNCTION public.business_daily_capacity(_business_id uuid, _start date, _end date)
RETURNS TABLE (route_date date, minutes_booked integer, minutes_capacity integer, load_pct numeric, employees_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH dates AS (SELECT generate_series(_start, _end, '1 day'::interval)::date AS d),
  emp_cap AS (
    SELECT COUNT(*)::int AS n_emp,
      SUM(COALESCE(max_hours_per_day, 8) * 60)::int AS minutes_per_day
    FROM public.employees
    WHERE business_id = _business_id AND COALESCE(is_active, true) = true
  ),
  booked AS (
    SELECT r.route_date AS d,
      COALESCE(SUM(COALESCE(rs.duration_minutes, 30) + COALESCE(rs.travel_time_to_next_min, 0)), 0)::int AS minutes
    FROM public.routes r
    LEFT JOIN public.route_stops rs ON rs.route_id = r.id
      AND COALESCE(rs.status, 'planned') NOT IN ('completed','cancelled')
    WHERE r.business_id = _business_id
      AND r.route_date BETWEEN _start AND _end
      AND r.archived_at IS NULL
      AND r.deleted_at IS NULL
    GROUP BY r.route_date
  )
  SELECT dates.d, COALESCE(booked.minutes, 0), COALESCE(emp_cap.minutes_per_day, 0),
    CASE WHEN COALESCE(emp_cap.minutes_per_day, 0) = 0 THEN 0
      ELSE ROUND((COALESCE(booked.minutes, 0)::numeric / emp_cap.minutes_per_day) * 100, 1) END,
    COALESCE(emp_cap.n_emp, 0)
  FROM dates CROSS JOIN emp_cap LEFT JOIN booked ON booked.d = dates.d
  ORDER BY dates.d;
$$;
GRANT EXECUTE ON FUNCTION public.business_daily_capacity(uuid, date, date) TO authenticated, service_role;

-- Skill mismatch now compares order service branch to employee branch skills.
CREATE OR REPLACE FUNCTION public.routes_with_skill_mismatch(_business_id uuid, _start date, _end date)
RETURNS TABLE (route_id uuid, missing_service_ids uuid[], missing_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH route_emp AS (
    SELECT r.id AS route_id, r.employee_id
    FROM public.routes r
    WHERE r.business_id = _business_id
      AND r.route_date BETWEEN _start AND _end
      AND r.employee_id IS NOT NULL
      AND r.archived_at IS NULL
      AND r.deleted_at IS NULL
  ),
  route_services AS (
    SELECT DISTINCT rs.route_id, oi.service_id,
      COALESCE(NULLIF(trim(s.service_category), ''), NULLIF(trim(s.subcategory), ''), s.name) AS skill_key
    FROM public.route_stops rs
    JOIN public.order_items oi ON oi.order_id = rs.order_id
    LEFT JOIN public.services s ON s.id = oi.service_id
    WHERE oi.service_id IS NOT NULL
      AND COALESCE(rs.status, 'planned') NOT IN ('completed','cancelled')
  ),
  uses AS (SELECT EXISTS (SELECT 1 FROM public.employee_skills WHERE business_id = _business_id AND skill_key IS NOT NULL) AS v),
  mismatches AS (
    SELECT rs.route_id, rs.service_id
    FROM route_services rs
    JOIN route_emp re ON re.route_id = rs.route_id
    CROSS JOIN uses
    WHERE uses.v = true
      AND rs.skill_key IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.employee_skills es
        WHERE es.employee_id = re.employee_id
          AND es.business_id = _business_id
          AND lower(es.skill_key) = lower(rs.skill_key)
      )
  )
  SELECT route_id, array_agg(DISTINCT service_id), COUNT(DISTINCT service_id)::int
  FROM mismatches GROUP BY route_id;
$$;
GRANT EXECUTE ON FUNCTION public.routes_with_skill_mismatch(uuid, date, date) TO authenticated, service_role;

-- Calendar RPC: hide archived/deleted routes and do not return empty routes unless they still have active stops.
CREATE OR REPLACE FUNCTION public.get_route_calendar(
  p_business_id uuid,
  p_from date,
  p_to date
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH
  candidate_routes AS (
    SELECT *
    FROM public.routes
    WHERE business_id = p_business_id
      AND route_date >= p_from
      AND route_date <= p_to
      AND archived_at IS NULL
      AND deleted_at IS NULL
  ),
  routes_in_range AS (
    SELECT r.*
    FROM candidate_routes r
    WHERE EXISTS (
      SELECT 1
      FROM public.route_stops rs
      LEFT JOIN public.agreement_occurrences ao ON ao.id = rs.agreement_occurrence_id
      WHERE rs.route_id = r.id
        AND COALESCE(ao.status::text, rs.status::text, 'planned') NOT IN ('completed', 'cancelled')
    )
  ),
  stops_in_range AS (
    SELECT s.*
    FROM public.route_stops s
    JOIN routes_in_range r ON r.id = s.route_id
  ),
  stops_with_extras AS (
    SELECT
      s.*,
      COALESCE(
        (SELECT array_agg(a.employee_id ORDER BY a.is_lead DESC, a.created_at)
         FROM public.route_stop_assignees a
         WHERE a.stop_id = s.id),
        ARRAY[]::uuid[]
      ) AS assignee_ids,
      (SELECT a.employee_id
         FROM public.route_stop_assignees a
        WHERE a.stop_id = s.id AND a.is_lead = true
        LIMIT 1) AS lead_employee_id,
      ao.status::text AS occurrence_status,
      ao.occurrence_date AS occurrence_date,
      COALESCE(a.id, sub_agr.id) AS agreement_id,
      COALESCE(
        a.interval::text,
        sub_agr.interval::text,
        sub.interval,
        (SELECT (oi.details->>'interval')
           FROM public.order_items oi
          WHERE oi.order_id = s.order_id
            AND oi.details ? 'interval'
          LIMIT 1)
      ) AS agreement_interval,
      COALESCE(o.adjusted_amount, o.total_amount, 0)::numeric AS order_amount,
      o.status::text AS order_status,
      o.payment_status::text AS order_payment_status,
      o.invoice_status::text AS order_invoice_status
    FROM stops_in_range s
    LEFT JOIN public.agreement_occurrences ao ON ao.id = s.agreement_occurrence_id
    LEFT JOIN public.agreements a ON a.id = ao.agreement_id
    LEFT JOIN public.subscriptions sub ON sub.id = s.subscription_id
    LEFT JOIN public.agreements sub_agr ON sub_agr.legacy_subscription_id = s.subscription_id
    LEFT JOIN public.orders o ON o.id = s.order_id
  ),
  unassigned AS (
    SELECT o.*
    FROM public.orders o
    WHERE o.business_id = p_business_id
      AND o.status IN ('confirmed', 'in_progress')
      AND NOT EXISTS (
        SELECT 1 FROM public.route_stops rs WHERE rs.order_id = o.id
      )
  )
  SELECT jsonb_build_object(
    'routes', COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.route_date, r.created_at) FROM routes_in_range r), '[]'::jsonb),
    'stops',  COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.route_id, s.sequence) FROM stops_with_extras s), '[]'::jsonb),
    'unassigned_jobs', COALESCE((SELECT jsonb_agg(to_jsonb(u)) FROM unassigned u), '[]'::jsonb)
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_route_calendar(uuid, date, date) TO authenticated;

-- Helper used by the app when a stop is removed from a route.
CREATE OR REPLACE FUNCTION public.cleanup_route_after_stop_delete(_route_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_route record;
  v_remaining int;
BEGIN
  SELECT id, business_id, route_date, name, archived_at, deleted_at
    INTO v_route
  FROM public.routes
  WHERE id = _route_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('route_deleted', false, 'remaining_stops', 0);
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = v_route.business_id AND b.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Du har ikke adgang til at ændre denne rute';
  END IF;

  SELECT COUNT(*) INTO v_remaining
  FROM public.route_stops rs
  WHERE rs.route_id = _route_id
    AND COALESCE(rs.status, 'planned') NOT IN ('completed', 'cancelled');

  IF v_remaining = 0 THEN
    DELETE FROM public.route_employees WHERE route_id = _route_id;
    DELETE FROM public.route_occurrence_exceptions WHERE replacement_route_id = _route_id;
    DELETE FROM public.routes WHERE id = _route_id;
    RETURN jsonb_build_object('route_deleted', true, 'remaining_stops', 0);
  END IF;

  RETURN jsonb_build_object('route_deleted', false, 'remaining_stops', v_remaining);
END;
$$;
GRANT EXECUTE ON FUNCTION public.cleanup_route_after_stop_delete(uuid) TO authenticated, service_role;
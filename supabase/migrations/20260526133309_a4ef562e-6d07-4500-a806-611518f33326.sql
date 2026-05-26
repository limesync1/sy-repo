CREATE OR REPLACE FUNCTION public.learned_service_durations(_business_id uuid)
RETURNS TABLE (
  service_id uuid, service_name text, avg_actual_minutes numeric,
  min_actual_minutes integer, max_actual_minutes integer,
  samples integer, suggested_minutes integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH hist AS (
    SELECT h.service_id, AVG(h.actual_minutes)::numeric AS avg_actual,
      MIN(h.actual_minutes)::int AS min_actual,
      MAX(h.actual_minutes)::int AS max_actual, COUNT(*)::int AS n
    FROM public.service_duration_history h
    WHERE h.business_id = _business_id
      AND h.completed_at >= now() - interval '60 days'
      AND h.actual_minutes BETWEEN 5 AND 600
    GROUP BY h.service_id
  )
  SELECT s.id, s.name, ROUND(hist.avg_actual, 1), hist.min_actual, hist.max_actual, hist.n,
    GREATEST(5, LEAST(600, ROUND(hist.avg_actual)::int))
  FROM hist JOIN public.services s ON s.id = hist.service_id
  WHERE s.business_id = _business_id AND hist.n >= 5;
$$;
GRANT EXECUTE ON FUNCTION public.learned_service_durations(uuid) TO authenticated, service_role;

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
    WHERE r.business_id = _business_id AND r.route_date BETWEEN _start AND _end
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

CREATE OR REPLACE FUNCTION public.routes_with_skill_mismatch(_business_id uuid, _start date, _end date)
RETURNS TABLE (route_id uuid, missing_service_ids uuid[], missing_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH route_emp AS (
    SELECT r.id AS route_id, r.employee_id
    FROM public.routes r
    WHERE r.business_id = _business_id
      AND r.route_date BETWEEN _start AND _end
      AND r.employee_id IS NOT NULL
  ),
  route_services AS (
    SELECT DISTINCT rs.route_id, oi.service_id
    FROM public.route_stops rs
    JOIN public.order_items oi ON oi.order_id = rs.order_id
    WHERE oi.service_id IS NOT NULL
  ),
  uses AS (SELECT EXISTS (SELECT 1 FROM public.employee_skills WHERE business_id = _business_id) AS v),
  mismatches AS (
    SELECT rs.route_id, rs.service_id
    FROM route_services rs
    JOIN route_emp re ON re.route_id = rs.route_id
    CROSS JOIN uses
    WHERE uses.v = true
      AND NOT EXISTS (
        SELECT 1 FROM public.employee_skills es
        WHERE es.employee_id = re.employee_id AND es.service_id = rs.service_id
      )
  )
  SELECT route_id, array_agg(DISTINCT service_id), COUNT(DISTINCT service_id)::int
  FROM mismatches GROUP BY route_id;
$$;
GRANT EXECUTE ON FUNCTION public.routes_with_skill_mismatch(uuid, date, date) TO authenticated, service_role;
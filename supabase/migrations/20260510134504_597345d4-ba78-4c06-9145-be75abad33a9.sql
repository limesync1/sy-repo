-- Unified calendar RPC: returns routes, stops (with assignees + occurrence status),
-- and unassigned jobs in a single round-trip.
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
  routes_in_range AS (
    SELECT *
    FROM public.routes
    WHERE business_id = p_business_id
      AND route_date >= p_from
      AND route_date <= p_to
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
      a.id AS agreement_id,
      a.interval::text AS agreement_interval
    FROM stops_in_range s
    LEFT JOIN public.agreement_occurrences ao ON ao.id = s.agreement_occurrence_id
    LEFT JOIN public.agreements a ON a.id = ao.agreement_id
  ),
  unassigned AS (
    SELECT o.*
    FROM public.orders o
    WHERE o.business_id = p_business_id
      AND o.status IN ('pending', 'confirmed', 'in_progress')
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
CREATE OR REPLACE FUNCTION public.get_route_calendar(p_business_id uuid, p_from date, p_to date)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  WITH
  routes_in_range AS (
    SELECT *
    FROM public.routes r
    WHERE r.business_id = p_business_id
      AND r.route_date >= p_from
      AND r.route_date <= p_to
      AND r.archived_at IS NULL
      AND r.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.route_occurrence_exceptions e
        WHERE e.business_id = r.business_id
          AND e.base_route_id = r.id
          AND e.occurrence_date = r.route_date
          AND e.exception_type IN ('moved', 'skipped')
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
$function$;

GRANT EXECUTE ON FUNCTION public.get_route_calendar(uuid, date, date) TO authenticated;
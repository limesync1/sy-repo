-- Phase 1: Unify agreements and subscriptions (foundation)

ALTER TABLE public.agreements
  ADD COLUMN IF NOT EXISTS legacy_subscription_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS agreements_legacy_subscription_id_key
  ON public.agreements(legacy_subscription_id)
  WHERE legacy_subscription_id IS NOT NULL;

ALTER TABLE public.agreement_occurrences
  ADD COLUMN IF NOT EXISTS legacy_order_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS agreement_occurrences_legacy_order_id_key
  ON public.agreement_occurrences(legacy_order_id)
  WHERE legacy_order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public._map_sub_interval(_interval text)
RETURNS public.agreement_interval
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE _interval
    WHEN 'engangskøb'  THEN 'engangskøb'::public.agreement_interval
    WHEN 'ugentlig'    THEN 'ugentlig'::public.agreement_interval
    WHEN 'hver_14_dag' THEN 'hver_14_dag'::public.agreement_interval
    WHEN 'hver_4_uge'  THEN 'hver_4_uge'::public.agreement_interval
    WHEN 'månedlig'    THEN 'månedlig'::public.agreement_interval
    WHEN 'kvartalsvis' THEN 'kvartalsvis'::public.agreement_interval
    WHEN 'halvårlig'   THEN 'halvårlig'::public.agreement_interval
    WHEN 'årlig'       THEN 'årlig'::public.agreement_interval
    ELSE 'custom'::public.agreement_interval
  END
$$;

WITH new_agreements AS (
  INSERT INTO public.agreements (
    legacy_subscription_id, business_id, customer_id, customer_name, customer_email, customer_phone,
    company_name, cvr, address, zip_code, city, latitude, longitude,
    start_date, interval, interval_days, estimated_duration_minutes,
    preferred_time_start, preferred_time_end, payment_terms_days, notes,
    total_amount, status, billing_model, requires_customer_approval, employee_ids
  )
  SELECT
    s.id, s.business_id, s.customer_id,
    COALESCE(s.customer_name, o.customer_name, 'Ukendt'),
    COALESCE(s.customer_email, o.customer_email, ''),
    o.customer_phone, o.company_name, o.cvr, o.address, o.zip_code, o.city, o.latitude, o.longitude,
    COALESCE((s.next_service_date AT TIME ZONE 'Europe/Copenhagen')::date, s.created_at::date, CURRENT_DATE),
    public._map_sub_interval(s.interval),
    NULL::int,
    o.estimated_duration_minutes, o.preferred_time_start, o.preferred_time_end, o.payment_terms_days,
    NULLIF(concat_ws(E'\n',
      o.notes,
      CASE WHEN s.interval NOT IN ('engangskøb','ugentlig','hver_14_dag','hver_4_uge','månedlig','kvartalsvis','halvårlig','årlig')
           THEN 'Original interval: ' || s.interval ELSE NULL END
    ), ''),
    s.total_price,
    CASE s.status
      WHEN 'active'    THEN 'active'::public.agreement_status
      WHEN 'paused'    THEN 'paused'::public.agreement_status
      WHEN 'cancelled' THEN 'cancelled'::public.agreement_status
      WHEN 'pending'   THEN 'pending_approval'::public.agreement_status
      ELSE 'active'::public.agreement_status
    END,
    'per_visit'::public.agreement_billing_model,
    false,
    '{}'::uuid[]
  FROM public.subscriptions s
  JOIN public.orders o ON o.id = s.order_id
  WHERE NOT EXISTS (SELECT 1 FROM public.agreements a WHERE a.legacy_subscription_id = s.id)
  RETURNING id, legacy_subscription_id
)
INSERT INTO public.agreement_items (agreement_id, service_id, service_name, quantity, unit_price, total_price, details)
SELECT na.id, oi.service_id,
       COALESCE(oi.service_name, s.service_name, 'Service'),
       COALESCE(oi.quantity, 1),
       COALESCE(oi.unit_price, s.total_price, 0),
       COALESCE(oi.total_price, s.total_price, 0),
       COALESCE(oi.details, s.details, '{}'::jsonb)
FROM new_agreements na
JOIN public.subscriptions s ON s.id = na.legacy_subscription_id
LEFT JOIN public.order_items oi
  ON oi.order_id = s.order_id AND (oi.service_id = s.service_id OR oi.service_id IS NULL);

INSERT INTO public.agreement_items (agreement_id, service_id, service_name, quantity, unit_price, total_price, details)
SELECT a.id, s.service_id, s.service_name, 1, s.total_price, s.total_price, COALESCE(s.details, '{}'::jsonb)
FROM public.agreements a
JOIN public.subscriptions s ON s.id = a.legacy_subscription_id
WHERE NOT EXISTS (SELECT 1 FROM public.agreement_items ai WHERE ai.agreement_id = a.id);

INSERT INTO public.agreement_occurrences (agreement_id, business_id, occurrence_date, sequence_index, status, employee_ids)
SELECT a.id, a.business_id,
       (s.next_service_date AT TIME ZONE 'Europe/Copenhagen')::date,
       0, 'planned'::public.occurrence_status, '{}'::uuid[]
FROM public.agreements a
JOIN public.subscriptions s ON s.id = a.legacy_subscription_id
WHERE s.status = 'active'
  AND s.next_service_date IS NOT NULL
  AND s.next_service_date >= now()
  AND NOT EXISTS (
    SELECT 1 FROM public.agreement_occurrences ao
    WHERE ao.agreement_id = a.id
      AND ao.occurrence_date = (s.next_service_date AT TIME ZONE 'Europe/Copenhagen')::date
  );

WITH stop_with_agreement AS (
  SELECT rs.id AS stop_id, rs.route_id, rs.order_id, r.business_id, r.route_date,
         a.id AS agreement_id, rs.assigned_employee_id
  FROM public.route_stops rs
  JOIN public.routes r ON r.id = rs.route_id
  JOIN public.subscriptions s ON s.order_id = rs.order_id
  JOIN public.agreements a ON a.legacy_subscription_id = s.id
  WHERE rs.order_id IS NOT NULL
    AND rs.agreement_occurrence_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.agreement_occurrences ao WHERE ao.legacy_order_id = rs.order_id)
), inserted_occurrences AS (
  INSERT INTO public.agreement_occurrences (
    agreement_id, business_id, occurrence_date, sequence_index, status, route_id, employee_ids, legacy_order_id
  )
  SELECT swa.agreement_id, swa.business_id, swa.route_date, 0,
         'planned'::public.occurrence_status, swa.route_id,
         CASE WHEN swa.assigned_employee_id IS NULL THEN '{}'::uuid[] ELSE ARRAY[swa.assigned_employee_id] END,
         swa.order_id
  FROM stop_with_agreement swa
  RETURNING id, legacy_order_id
)
UPDATE public.route_stops rs
   SET agreement_occurrence_id = io.id
  FROM inserted_occurrences io
 WHERE rs.order_id = io.legacy_order_id
   AND rs.agreement_occurrence_id IS NULL;

DROP FUNCTION IF EXISTS public._map_sub_interval(text);
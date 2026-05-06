
-- 1) Tillad 'book' (og 'upsert') operationer i sync-køen så stop-completion ikke fejler
ALTER TABLE public.accounting_sync_queue
  DROP CONSTRAINT IF EXISTS accounting_sync_queue_operation_check;
ALTER TABLE public.accounting_sync_queue
  ADD CONSTRAINT accounting_sync_queue_operation_check
  CHECK (operation = ANY (ARRAY['create','update','delete','book','upsert']));

-- 2) Snapshot-tabel: bevar medarbejderens indtjening + historik selvom rute/stop slettes
CREATE TABLE IF NOT EXISTS public.employee_completed_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  stop_id uuid,
  order_id uuid,
  route_id uuid,
  route_name text,
  route_date date,
  customer_name text,
  service_summary text,
  address text,
  completed_at timestamptz NOT NULL,
  duration_minutes int,
  order_amount numeric NOT NULL DEFAULT 0,
  sharers int NOT NULL DEFAULT 1,
  commission_pct numeric NOT NULL DEFAULT 0,
  earnings numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS employee_completed_stops_unique_per_emp_stop
  ON public.employee_completed_stops (employee_id, stop_id)
  WHERE stop_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS employee_completed_stops_business_idx
  ON public.employee_completed_stops (business_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS employee_completed_stops_employee_idx
  ON public.employee_completed_stops (employee_id, completed_at DESC);

ALTER TABLE public.employee_completed_stops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners read snapshots" ON public.employee_completed_stops;
CREATE POLICY "Owners read snapshots" ON public.employee_completed_stops
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Employees read own snapshots" ON public.employee_completed_stops;
CREATE POLICY "Employees read own snapshots" ON public.employee_completed_stops
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.user_id = auth.uid())
  );

-- 3) Trigger: skriv snapshot når et stop markeres completed
CREATE OR REPLACE FUNCTION public.snapshot_completed_stop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_order RECORD;
  v_route RECORD;
  v_amount numeric;
  v_assignees uuid[];
  v_emp uuid;
  v_pct numeric;
  v_share numeric;
  v_sharers int;
BEGIN
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN RETURN NEW; END IF;
  IF NEW.order_id IS NULL THEN RETURN NEW; END IF;

  SELECT id, business_id, total_amount, adjusted_amount
    INTO v_order FROM public.orders WHERE id = NEW.order_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  v_amount := COALESCE(v_order.adjusted_amount, v_order.total_amount, 0);

  SELECT id, name, route_date, employee_id INTO v_route
    FROM public.routes WHERE id = NEW.route_id;

  -- Saml unikke assignees: route_stop_assignees > assigned_employee_id > route_employees > routes.employee_id
  SELECT array_agg(DISTINCT employee_id) INTO v_assignees
    FROM public.route_stop_assignees WHERE stop_id = NEW.id;

  IF v_assignees IS NULL OR array_length(v_assignees, 1) IS NULL THEN
    IF NEW.assigned_employee_id IS NOT NULL THEN
      v_assignees := ARRAY[NEW.assigned_employee_id];
    ELSE
      SELECT array_agg(DISTINCT employee_id) INTO v_assignees
        FROM public.route_employees WHERE route_id = NEW.route_id;
      IF (v_assignees IS NULL OR array_length(v_assignees, 1) IS NULL) AND v_route.employee_id IS NOT NULL THEN
        v_assignees := ARRAY[v_route.employee_id];
      END IF;
    END IF;
  END IF;

  IF v_assignees IS NULL OR array_length(v_assignees, 1) IS NULL THEN RETURN NEW; END IF;
  v_sharers := array_length(v_assignees, 1);

  FOREACH v_emp IN ARRAY v_assignees LOOP
    SELECT COALESCE(commission_pct, 0) INTO v_pct FROM public.employees WHERE id = v_emp;
    v_pct := COALESCE(v_pct, 0);
    -- ekskl. moms 25%, andel pr. medarbejder
    v_share := CASE WHEN v_amount > 0 AND v_pct > 0
      THEN (v_amount / 1.25) * (v_pct / 100.0) / GREATEST(v_sharers, 1)
      ELSE 0 END;

    INSERT INTO public.employee_completed_stops (
      business_id, employee_id, stop_id, order_id, route_id, route_name, route_date,
      customer_name, service_summary, address, completed_at, duration_minutes,
      order_amount, sharers, commission_pct, earnings
    ) VALUES (
      v_order.business_id, v_emp, NEW.id, NEW.order_id, NEW.route_id, v_route.name, v_route.route_date,
      NEW.customer_name, NEW.service_summary, NEW.address,
      COALESCE(NEW.completed_at, now()), NEW.duration_minutes,
      v_amount, v_sharers, v_pct, v_share
    )
    ON CONFLICT (employee_id, stop_id) WHERE stop_id IS NOT NULL DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_snapshot_completed_stop ON public.route_stops;
CREATE TRIGGER trg_snapshot_completed_stop
  AFTER INSERT OR UPDATE OF status ON public.route_stops
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_completed_stop();

-- 4) Når et stop slettes, behold snapshot (sæt FK-værdier til NULL)
CREATE OR REPLACE FUNCTION public.detach_snapshot_on_stop_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  UPDATE public.employee_completed_stops
     SET stop_id = NULL
   WHERE stop_id = OLD.id;
  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS trg_detach_snapshot_on_stop_delete ON public.route_stops;
CREATE TRIGGER trg_detach_snapshot_on_stop_delete
  BEFORE DELETE ON public.route_stops
  FOR EACH ROW EXECUTE FUNCTION public.detach_snapshot_on_stop_delete();

-- 5) Backfill: opret snapshots for alle eksisterende completed stops
INSERT INTO public.employee_completed_stops (
  business_id, employee_id, stop_id, order_id, route_id, route_name, route_date,
  customer_name, service_summary, address, completed_at, duration_minutes,
  order_amount, sharers, commission_pct, earnings
)
SELECT
  o.business_id, asg.emp, rs.id, rs.order_id, rs.route_id, r.name, r.route_date,
  rs.customer_name, rs.service_summary, rs.address,
  COALESCE(rs.completed_at, now()), rs.duration_minutes,
  COALESCE(o.adjusted_amount, o.total_amount, 0),
  asg.sharers,
  COALESCE(e.commission_pct, 0),
  CASE WHEN COALESCE(o.adjusted_amount, o.total_amount, 0) > 0 AND COALESCE(e.commission_pct,0) > 0
    THEN (COALESCE(o.adjusted_amount, o.total_amount, 0) / 1.25) * (COALESCE(e.commission_pct,0) / 100.0) / GREATEST(asg.sharers, 1)
    ELSE 0 END
FROM public.route_stops rs
JOIN public.orders o ON o.id = rs.order_id
LEFT JOIN public.routes r ON r.id = rs.route_id
JOIN LATERAL (
  WITH ex AS (SELECT employee_id FROM public.route_stop_assignees WHERE stop_id = rs.id),
  fallback_route AS (
    SELECT employee_id FROM public.route_employees WHERE route_id = rs.route_id
    UNION
    SELECT employee_id FROM public.routes WHERE id = rs.route_id AND employee_id IS NOT NULL
  ),
  src AS (
    SELECT employee_id FROM ex
    UNION
    SELECT rs.assigned_employee_id WHERE NOT EXISTS (SELECT 1 FROM ex) AND rs.assigned_employee_id IS NOT NULL
    UNION
    SELECT employee_id FROM fallback_route WHERE NOT EXISTS (SELECT 1 FROM ex) AND rs.assigned_employee_id IS NULL
  )
  SELECT employee_id AS emp, (SELECT COUNT(DISTINCT employee_id) FROM src)::int AS sharers
    FROM src WHERE employee_id IS NOT NULL
) asg ON true
JOIN public.employees e ON e.id = asg.emp
WHERE rs.status = 'completed'
ON CONFLICT (employee_id, stop_id) WHERE stop_id IS NOT NULL DO NOTHING;

-- 1) stop_time_entries: per-medarbejder check-in/out per stop
CREATE TABLE public.stop_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stop_id uuid NOT NULL REFERENCES public.route_stops(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_minutes integer GENERATED ALWAYS AS (
    CASE WHEN ended_at IS NOT NULL
      THEN GREATEST(0, EXTRACT(EPOCH FROM (ended_at - started_at))::int / 60)
      ELSE NULL END
  ) STORED,
  is_team_fallback boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_stop_time_entries_stop ON public.stop_time_entries(stop_id);
CREATE INDEX idx_stop_time_entries_employee ON public.stop_time_entries(employee_id);

ALTER TABLE public.stop_time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage stop time entries"
ON public.stop_time_entries FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners manage their stop time entries"
ON public.stop_time_entries FOR ALL
USING (EXISTS (
  SELECT 1 FROM route_stops rs
  JOIN routes r ON r.id = rs.route_id
  JOIN businesses b ON b.id = r.business_id
  WHERE rs.id = stop_time_entries.stop_id AND b.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM route_stops rs
  JOIN routes r ON r.id = rs.route_id
  JOIN businesses b ON b.id = r.business_id
  WHERE rs.id = stop_time_entries.stop_id AND b.owner_id = auth.uid()
));

CREATE POLICY "Employees insert their own time entries"
ON public.stop_time_entries FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM employees e
  WHERE e.id = stop_time_entries.employee_id AND e.user_id = auth.uid()
));

CREATE POLICY "Employees update their own time entries"
ON public.stop_time_entries FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM employees e
  WHERE e.id = stop_time_entries.employee_id AND e.user_id = auth.uid()
));

CREATE POLICY "Employees view their own time entries"
ON public.stop_time_entries FOR SELECT
USING (EXISTS (
  SELECT 1 FROM employees e
  WHERE e.id = stop_time_entries.employee_id AND e.user_id = auth.uid()
));

CREATE TRIGGER trg_stop_time_entries_updated_at
  BEFORE UPDATE ON public.stop_time_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) employee_workdays: arbejdsdag start/stop
CREATE TABLE public.employee_workdays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  workday_date date NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_minutes integer GENERATED ALWAYS AS (
    CASE WHEN ended_at IS NOT NULL
      THEN GREATEST(0, EXTRACT(EPOCH FROM (ended_at - started_at))::int / 60)
      ELSE NULL END
  ) STORED,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, workday_date)
);
CREATE INDEX idx_workdays_emp_date ON public.employee_workdays(employee_id, workday_date);

ALTER TABLE public.employee_workdays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage workdays"
ON public.employee_workdays FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners manage their employees workdays"
ON public.employee_workdays FOR ALL
USING (EXISTS (
  SELECT 1 FROM employees e
  JOIN businesses b ON b.id = e.business_id
  WHERE e.id = employee_workdays.employee_id AND b.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM employees e
  JOIN businesses b ON b.id = e.business_id
  WHERE e.id = employee_workdays.employee_id AND b.owner_id = auth.uid()
));

CREATE POLICY "Employees manage own workdays"
ON public.employee_workdays FOR ALL
USING (EXISTS (
  SELECT 1 FROM employees e
  WHERE e.id = employee_workdays.employee_id AND e.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM employees e
  WHERE e.id = employee_workdays.employee_id AND e.user_id = auth.uid()
));

CREATE TRIGGER trg_workdays_updated_at
  BEFORE UPDATE ON public.employee_workdays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Auto-justering af estimated_duration_minutes via vægtet glidende gennemsnit
CREATE OR REPLACE FUNCTION public.update_service_duration_estimate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_business_id uuid;
  v_customer_email text;
  v_service_id uuid;
  v_team_minutes numeric;
  v_avg numeric;
BEGIN
  -- Kun ved overgang til completed
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN RETURN NEW; END IF;
  IF NEW.order_id IS NULL THEN RETURN NEW; END IF;

  -- Hent kontekst
  SELECT o.business_id, o.customer_email, oi.service_id
    INTO v_business_id, v_customer_email, v_service_id
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id
  WHERE o.id = NEW.order_id
  LIMIT 1;

  IF v_service_id IS NULL OR v_business_id IS NULL THEN RETURN NEW; END IF;

  -- Faktisk team-tid på dette stop = max(per-medarbejder duration)
  SELECT COALESCE(MAX(duration_minutes), NULL)
    INTO v_team_minutes
  FROM stop_time_entries
  WHERE stop_id = NEW.id AND ended_at IS NOT NULL;

  IF v_team_minutes IS NULL OR v_team_minutes <= 0 THEN RETURN NEW; END IF;

  -- Vægtet gennemsnit af sidste 5 udførelser (nyere vægter mere)
  WITH recent AS (
    SELECT
      ste_max.team_minutes,
      ROW_NUMBER() OVER (ORDER BY rs.completed_at DESC) AS rn
    FROM route_stops rs
    JOIN orders o ON o.id = rs.order_id
    JOIN order_items oi ON oi.order_id = o.id
    JOIN LATERAL (
      SELECT MAX(duration_minutes) AS team_minutes
      FROM stop_time_entries ste
      WHERE ste.stop_id = rs.id AND ste.ended_at IS NOT NULL
    ) ste_max ON true
    WHERE o.business_id = v_business_id
      AND o.customer_email = v_customer_email
      AND oi.service_id = v_service_id
      AND rs.status = 'completed'
      AND ste_max.team_minutes IS NOT NULL
    LIMIT 5
  )
  SELECT SUM(team_minutes * w) / NULLIF(SUM(w), 0)
    INTO v_avg
  FROM (
    SELECT team_minutes,
           CASE rn WHEN 1 THEN 5.0 WHEN 2 THEN 3.0 WHEN 3 THEN 2.0 WHEN 4 THEN 1.5 ELSE 1.0 END AS w
    FROM recent
  ) weighted;

  IF v_avg IS NULL OR v_avg <= 0 THEN RETURN NEW; END IF;

  -- Opdater estimat på fremtidige pending stops af samme kunde+service
  UPDATE route_stops rs
     SET duration_minutes = ROUND(v_avg)::int,
         updated_at = now()
    FROM orders o, order_items oi
   WHERE rs.order_id = o.id
     AND oi.order_id = o.id
     AND o.business_id = v_business_id
     AND o.customer_email = v_customer_email
     AND oi.service_id = v_service_id
     AND rs.status = 'pending'
     AND rs.id <> NEW.id;

  -- Opdater også estimated_duration_minutes på fremtidige orders
  UPDATE orders
     SET estimated_duration_minutes = ROUND(v_avg)::int,
         updated_at = now()
   WHERE business_id = v_business_id
     AND customer_email = v_customer_email
     AND status IN ('pending','confirmed')
     AND id IN (
       SELECT oi2.order_id FROM order_items oi2 WHERE oi2.service_id = v_service_id
     );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_duration_estimate
AFTER UPDATE OF status ON public.route_stops
FOR EACH ROW EXECUTE FUNCTION public.update_service_duration_estimate();
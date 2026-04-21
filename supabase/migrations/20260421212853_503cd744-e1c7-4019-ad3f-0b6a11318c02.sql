-- Per-medarbejder læring: hvor lang tid bruger HVER medarbejder på en bestemt service hos en bestemt kunde
CREATE TABLE IF NOT EXISTS public.service_employee_durations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  service_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  customer_email text NOT NULL,
  avg_minutes numeric NOT NULL,
  sample_count integer NOT NULL DEFAULT 1,
  last_minutes integer,
  last_completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (business_id, service_id, employee_id, customer_email)
);

CREATE INDEX IF NOT EXISTS idx_sed_lookup ON public.service_employee_durations (business_id, service_id, customer_email);

ALTER TABLE public.service_employee_durations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage durations"
  ON public.service_employee_durations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners manage their durations"
  ON public.service_employee_durations FOR ALL
  USING (EXISTS (SELECT 1 FROM businesses b WHERE b.id = service_employee_durations.business_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM businesses b WHERE b.id = service_employee_durations.business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Employees view their durations"
  ON public.service_employee_durations FOR SELECT
  USING (EXISTS (SELECT 1 FROM employees e WHERE e.id = service_employee_durations.employee_id AND e.user_id = auth.uid()));

-- Erstat trigger: per-medarbejder vægtet gennemsnit
CREATE OR REPLACE FUNCTION public.update_service_duration_estimate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_business_id uuid;
  v_customer_email text;
  v_service_id uuid;
  v_entry RECORD;
  v_avg numeric;
  v_count integer;
  v_team_estimate numeric;
BEGIN
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN RETURN NEW; END IF;
  IF NEW.order_id IS NULL THEN RETURN NEW; END IF;

  SELECT o.business_id, o.customer_email, oi.service_id
    INTO v_business_id, v_customer_email, v_service_id
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id
  WHERE o.id = NEW.order_id
  LIMIT 1;

  IF v_service_id IS NULL OR v_business_id IS NULL THEN RETURN NEW; END IF;

  -- For HVER medarbejder der har en time-entry på dette stop:
  FOR v_entry IN
    SELECT employee_id, duration_minutes
    FROM stop_time_entries
    WHERE stop_id = NEW.id
      AND ended_at IS NOT NULL
      AND duration_minutes IS NOT NULL
      AND duration_minutes > 0
  LOOP
    -- Vægtet gennemsnit af denne medarbejders sidste 5 udførelser af samme service hos samme kunde
    WITH recent AS (
      SELECT ste.duration_minutes,
             ROW_NUMBER() OVER (ORDER BY rs.completed_at DESC) AS rn
      FROM stop_time_entries ste
      JOIN route_stops rs ON rs.id = ste.stop_id
      JOIN orders o ON o.id = rs.order_id
      JOIN order_items oi ON oi.order_id = o.id
      WHERE ste.employee_id = v_entry.employee_id
        AND ste.ended_at IS NOT NULL
        AND ste.duration_minutes IS NOT NULL
        AND o.business_id = v_business_id
        AND o.customer_email = v_customer_email
        AND oi.service_id = v_service_id
        AND rs.status = 'completed'
      LIMIT 5
    )
    SELECT SUM(duration_minutes * w) / NULLIF(SUM(w), 0), COUNT(*)
      INTO v_avg, v_count
    FROM (
      SELECT duration_minutes,
             CASE rn WHEN 1 THEN 5.0 WHEN 2 THEN 3.0 WHEN 3 THEN 2.0 WHEN 4 THEN 1.5 ELSE 1.0 END AS w
      FROM recent
    ) weighted;

    IF v_avg IS NULL OR v_avg <= 0 THEN CONTINUE; END IF;

    INSERT INTO service_employee_durations
      (business_id, service_id, employee_id, customer_email, avg_minutes, sample_count, last_minutes, last_completed_at)
    VALUES
      (v_business_id, v_service_id, v_entry.employee_id, v_customer_email, v_avg, v_count, v_entry.duration_minutes, now())
    ON CONFLICT (business_id, service_id, employee_id, customer_email)
    DO UPDATE SET
      avg_minutes = EXCLUDED.avg_minutes,
      sample_count = EXCLUDED.sample_count,
      last_minutes = EXCLUDED.last_minutes,
      last_completed_at = EXCLUDED.last_completed_at,
      updated_at = now();
  END LOOP;

  -- Beregn nyt team-estimat for fremtidige stops baseret på hvilke medarbejdere der er tildelt
  -- Fallback: hvis ingen medarbejder-historik findes, brug max af de medarbejdere på dette stop
  WITH stop_team_avg AS (
    SELECT MAX(sed.avg_minutes) AS team_min
    FROM stop_time_entries ste
    LEFT JOIN service_employee_durations sed ON
      sed.employee_id = ste.employee_id
      AND sed.business_id = v_business_id
      AND sed.service_id = v_service_id
      AND sed.customer_email = v_customer_email
    WHERE ste.stop_id = NEW.id AND ste.ended_at IS NOT NULL
  )
  SELECT team_min INTO v_team_estimate FROM stop_team_avg;

  IF v_team_estimate IS NULL OR v_team_estimate <= 0 THEN RETURN NEW; END IF;

  -- Opdatér fremtidige pending stops (samme kunde+service) — bruger team-estimat baseret på tildelte medarbejdere
  UPDATE route_stops rs
     SET duration_minutes = COALESCE((
           SELECT GREATEST(MAX(sed.avg_minutes), 1)
           FROM route_stop_assignees rsa
           JOIN service_employee_durations sed ON sed.employee_id = rsa.employee_id
           WHERE rsa.stop_id = rs.id
             AND sed.business_id = v_business_id
             AND sed.service_id = v_service_id
             AND sed.customer_email = v_customer_email
         ), ROUND(v_team_estimate)::int),
         updated_at = now()
    FROM orders o, order_items oi
   WHERE rs.order_id = o.id
     AND oi.order_id = o.id
     AND o.business_id = v_business_id
     AND o.customer_email = v_customer_email
     AND oi.service_id = v_service_id
     AND rs.status = 'pending'
     AND rs.id <> NEW.id;

  UPDATE orders
     SET estimated_duration_minutes = ROUND(v_team_estimate)::int,
         updated_at = now()
   WHERE business_id = v_business_id
     AND customer_email = v_customer_email
     AND status IN ('pending','confirmed')
     AND id IN (SELECT oi2.order_id FROM order_items oi2 WHERE oi2.service_id = v_service_id);

  RETURN NEW;
END;
$function$;

-- Gentilknyt trigger
DROP TRIGGER IF EXISTS trg_update_service_duration_estimate ON public.route_stops;
CREATE TRIGGER trg_update_service_duration_estimate
  AFTER UPDATE ON public.route_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_service_duration_estimate();
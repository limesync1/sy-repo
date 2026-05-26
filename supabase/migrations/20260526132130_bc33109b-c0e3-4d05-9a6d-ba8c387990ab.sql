
-- 1) Employee capacity columns
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS max_hours_per_day numeric,
  ADD COLUMN IF NOT EXISTS max_km_per_day numeric,
  ADD COLUMN IF NOT EXISTS max_stops_per_day integer;

-- 2) employee_skills
CREATE TABLE IF NOT EXISTS public.employee_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  business_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, service_id)
);
CREATE INDEX IF NOT EXISTS idx_employee_skills_employee ON public.employee_skills(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_service ON public.employee_skills(service_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_business ON public.employee_skills(business_id);

ALTER TABLE public.employee_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage employee_skills" ON public.employee_skills;
CREATE POLICY "Owners manage employee_skills" ON public.employee_skills
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = employee_skills.business_id AND b.owner_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = employee_skills.business_id AND b.owner_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Employees view own skills" ON public.employee_skills;
CREATE POLICY "Employees view own skills" ON public.employee_skills
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_skills.employee_id AND e.user_id = auth.uid()));

-- 3) services.weather_sensitive
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS weather_sensitive boolean NOT NULL DEFAULT false;

-- 4) zone_key on customers
ALTER TABLE public.private_customers ADD COLUMN IF NOT EXISTS zone_key text;
ALTER TABLE public.business_customers ADD COLUMN IF NOT EXISTS zone_key text;

CREATE OR REPLACE FUNCTION public.derive_zone_key(zip text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN zip IS NULL OR length(trim(zip)) < 2 THEN NULL
    ELSE substring(trim(zip) from 1 for 2)
  END;
$$;

CREATE OR REPLACE FUNCTION public.set_customer_zone_key()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.zone_key := public.derive_zone_key(NEW.zip_code);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_zone_key_private ON public.private_customers;
CREATE TRIGGER trg_set_zone_key_private
  BEFORE INSERT OR UPDATE OF zip_code ON public.private_customers
  FOR EACH ROW EXECUTE FUNCTION public.set_customer_zone_key();

DROP TRIGGER IF EXISTS trg_set_zone_key_business ON public.business_customers;
CREATE TRIGGER trg_set_zone_key_business
  BEFORE INSERT OR UPDATE OF zip_code ON public.business_customers
  FOR EACH ROW EXECUTE FUNCTION public.set_customer_zone_key();

UPDATE public.private_customers SET zone_key = public.derive_zone_key(zip_code) WHERE zone_key IS NULL AND zip_code IS NOT NULL;
UPDATE public.business_customers SET zone_key = public.derive_zone_key(zip_code) WHERE zone_key IS NULL AND zip_code IS NOT NULL;

-- 5) service_duration_history
CREATE TABLE IF NOT EXISTS public.service_duration_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  route_stop_id uuid,
  estimated_minutes integer,
  actual_minutes integer NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sdh_service ON public.service_duration_history(service_id);
CREATE INDEX IF NOT EXISTS idx_sdh_business ON public.service_duration_history(business_id);
CREATE INDEX IF NOT EXISTS idx_sdh_completed ON public.service_duration_history(completed_at DESC);

ALTER TABLE public.service_duration_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners view duration history" ON public.service_duration_history;
CREATE POLICY "Owners view duration history" ON public.service_duration_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = service_duration_history.business_id AND b.owner_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE OR REPLACE FUNCTION public.record_stop_duration_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_business_id uuid;
  v_service_id uuid;
  v_actual_min integer;
BEGIN
  IF NEW.status <> 'completed' OR (OLD.status IS NOT DISTINCT FROM 'completed') THEN
    RETURN NEW;
  END IF;
  IF NEW.completed_at IS NULL OR NEW.planned_arrival IS NULL THEN
    RETURN NEW;
  END IF;

  v_actual_min := LEAST(480, GREATEST(1, EXTRACT(EPOCH FROM (NEW.completed_at - NEW.planned_arrival))::int / 60));

  SELECT r.business_id INTO v_business_id FROM public.routes r WHERE r.id = NEW.route_id;
  IF v_business_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.subscription_id IS NOT NULL THEN
    SELECT s.service_id INTO v_service_id FROM public.subscriptions s WHERE s.id = NEW.subscription_id;
  END IF;

  INSERT INTO public.service_duration_history (business_id, service_id, employee_id, route_stop_id, estimated_minutes, actual_minutes)
  VALUES (v_business_id, v_service_id, NEW.assigned_employee_id, NEW.id, NEW.duration_minutes, v_actual_min);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_stop_duration ON public.route_stops;
CREATE TRIGGER trg_record_stop_duration
  AFTER UPDATE OF status ON public.route_stops
  FOR EACH ROW EXECUTE FUNCTION public.record_stop_duration_history();

-- 6) RPC: get_employee_capacity_usage
CREATE OR REPLACE FUNCTION public.get_employee_capacity_usage(_employee_id uuid, _date date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_emp record;
  v_stops int; v_minutes int; v_km numeric;
BEGIN
  SELECT id, max_hours_per_day, max_km_per_day, max_stops_per_day
  INTO v_emp FROM public.employees WHERE id = _employee_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COUNT(rs.id),
         COALESCE(SUM(COALESCE(rs.duration_minutes,30)),0)::int + COALESCE(SUM(COALESCE(rs.travel_time_to_next_min,0)),0)::int,
         COALESCE(SUM(rs.distance_to_next_km),0)
  INTO v_stops, v_minutes, v_km
  FROM public.routes r
  JOIN public.route_stops rs ON rs.route_id = r.id
  WHERE r.employee_id = _employee_id AND r.route_date = _date AND r.deleted_at IS NULL;

  RETURN jsonb_build_object(
    'stops_used', COALESCE(v_stops,0),
    'stops_max', v_emp.max_stops_per_day,
    'minutes_used', COALESCE(v_minutes,0),
    'hours_max', v_emp.max_hours_per_day,
    'km_used', COALESCE(v_km,0),
    'km_max', v_emp.max_km_per_day
  );
END;
$$;

-- 7) RPC: suggest_routes_for_stop
CREATE OR REPLACE FUNCTION public.suggest_routes_for_stop(
  _business_id uuid,
  _date date,
  _latitude numeric,
  _longitude numeric,
  _service_id uuid DEFAULT NULL,
  _duration_minutes int DEFAULT 30,
  _zone_key text DEFAULT NULL,
  _weather_bad boolean DEFAULT false
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result jsonb := '[]'::jsonb;
  v_row record;
BEGIN
  FOR v_row IN
    WITH route_data AS (
      SELECT r.id, r.name, r.employee_id, r.route_date, e.name AS employee_name,
             e.max_hours_per_day, e.max_km_per_day, e.max_stops_per_day,
             (SELECT COUNT(*) FROM route_stops rs WHERE rs.route_id = r.id) AS stop_count,
             (SELECT COALESCE(SUM(COALESCE(rs.duration_minutes,30)),0) + COALESCE(SUM(COALESCE(rs.travel_time_to_next_min,0)),0)
                FROM route_stops rs WHERE rs.route_id = r.id) AS minutes_used,
             (SELECT COALESCE(SUM(rs.distance_to_next_km),0) FROM route_stops rs WHERE rs.route_id = r.id) AS km_used,
             (SELECT MIN(
                 6371 * acos(
                   LEAST(1, GREATEST(-1,
                     cos(radians(_latitude)) * cos(radians(rs.latitude)) * cos(radians(rs.longitude) - radians(_longitude))
                     + sin(radians(_latitude)) * sin(radians(rs.latitude))
                   ))
                 )
                )
                FROM route_stops rs
                WHERE rs.route_id = r.id AND rs.latitude IS NOT NULL AND rs.longitude IS NOT NULL
             ) AS nearest_km,
             (CASE WHEN _service_id IS NULL THEN true
                ELSE EXISTS (SELECT 1 FROM employee_skills es WHERE es.employee_id = r.employee_id AND es.service_id = _service_id)
              END) AS has_skill,
             (CASE WHEN _zone_key IS NULL THEN false
                ELSE EXISTS (
                  SELECT 1 FROM route_stops rs LEFT JOIN orders o ON o.id = rs.order_id
                  WHERE rs.route_id = r.id AND substring(trim(coalesce(o.zip_code,'')) from 1 for 2) = _zone_key
                )
              END) AS same_zone
      FROM routes r
      JOIN employees e ON e.id = r.employee_id
      WHERE r.business_id = _business_id
        AND r.route_date = _date
        AND r.deleted_at IS NULL
    )
    SELECT *,
      LEAST(100, GREATEST(0,
        GREATEST(0, 60 - COALESCE(nearest_km,50))::numeric * 0.6
        + (CASE WHEN has_skill THEN 20 ELSE 0 END)
        + (CASE WHEN max_stops_per_day IS NULL THEN 10
                WHEN stop_count < max_stops_per_day THEN 10
                ELSE -20 END)
        + (CASE WHEN max_hours_per_day IS NULL THEN 5
                WHEN (minutes_used + _duration_minutes) <= max_hours_per_day*60 THEN 5
                ELSE -20 END)
        + (CASE WHEN same_zone THEN 15 ELSE 0 END)
        + (CASE WHEN _weather_bad THEN -10 ELSE 0 END)
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
      'nearest_km', round(v_row.nearest_km::numeric,1),
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

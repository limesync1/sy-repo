
CREATE TABLE public.route_materialization_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  agreement_id UUID,
  occurrence_id UUID,
  occurrence_date DATE,
  target_route_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  last_error TEXT,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT route_materialization_jobs_status_check
    CHECK (status IN ('pending','running','done','failed','cancelled'))
);

CREATE INDEX idx_rmj_status_attempt ON public.route_materialization_jobs(status, next_attempt_at)
  WHERE status IN ('pending','running');
CREATE INDEX idx_rmj_business ON public.route_materialization_jobs(business_id, created_at DESC);
CREATE INDEX idx_rmj_agreement ON public.route_materialization_jobs(agreement_id);

CREATE TRIGGER route_materialization_jobs_updated_at
BEFORE UPDATE ON public.route_materialization_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.route_materialization_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all materialization jobs"
ON public.route_materialization_jobs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Business owners read their jobs"
ON public.route_materialization_jobs FOR SELECT
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = route_materialization_jobs.business_id AND b.owner_id = auth.uid()));

-- Bemærk: INGEN policy for INSERT/UPDATE/DELETE for almindelige brugere.
-- Køen administreres KUN af SECURITY DEFINER-funktioner nedenfor, så vi
-- kan ikke kobble klient-mutationer udenom retry-/idempotens-laget.

CREATE OR REPLACE FUNCTION public.enqueue_route_materialization(
  p_business_id UUID,
  p_idempotency_key TEXT,
  p_agreement_id UUID DEFAULT NULL,
  p_occurrence_id UUID DEFAULT NULL,
  p_occurrence_date DATE DEFAULT NULL,
  p_target_route_id UUID DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_delay_seconds INT DEFAULT 0
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_business_id IS NULL OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'business_id and idempotency_key are required';
  END IF;
  INSERT INTO public.route_materialization_jobs (
    business_id, idempotency_key, agreement_id, occurrence_id,
    occurrence_date, target_route_id, payload,
    next_attempt_at
  ) VALUES (
    p_business_id, p_idempotency_key, p_agreement_id, p_occurrence_id,
    p_occurrence_date, p_target_route_id, COALESCE(p_payload, '{}'::jsonb),
    now() + make_interval(secs => GREATEST(0, p_delay_seconds))
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_route_materialization(UUID, TEXT, UUID, UUID, DATE, UUID, JSONB, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_route_materialization(UUID, TEXT, UUID, UUID, DATE, UUID, JSONB, INT) TO authenticated;

-- Intern materialisering uden auth-check — kun callbar fra worker (SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public._worker_materialize_occurrence(
  _occurrence_id UUID,
  _target_route_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_o RECORD;
  v_a RECORD;
  v_r RECORD;
  v_seq INT;
  v_planned_arrival TIMESTAMPTZ;
  v_stop_id UUID;
BEGIN
  SELECT * INTO v_o FROM public.agreement_occurrences WHERE id = _occurrence_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Occurrence not found: %', _occurrence_id; END IF;
  IF v_o.route_id IS NOT NULL THEN RETURN NULL; END IF; -- allerede materialiseret, idempotent

  SELECT * INTO v_r FROM public.routes WHERE id = _target_route_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Route not found: %', _target_route_id; END IF;
  IF v_r.business_id <> v_o.business_id THEN
    RAISE EXCEPTION 'Route belongs to a different business';
  END IF;

  SELECT * INTO v_a FROM public.agreements WHERE id = v_o.agreement_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Agreement not found'; END IF;

  SELECT COALESCE(MAX(sequence), -1) + 1 INTO v_seq
    FROM public.route_stops WHERE route_id = _target_route_id;

  v_planned_arrival := v_o.planned_arrival;
  IF v_planned_arrival IS NULL AND v_a.preferred_time_start IS NOT NULL THEN
    v_planned_arrival := ((v_r.route_date::timestamp + v_a.preferred_time_start)
                          AT TIME ZONE 'Europe/Copenhagen');
  END IF;

  INSERT INTO public.route_stops (
    route_id, agreement_occurrence_id, sequence, status,
    customer_name, customer_phone, address, latitude, longitude,
    service_summary, notes, planned_arrival,
    duration_minutes, time_window_start, time_window_end
  ) VALUES (
    _target_route_id, v_o.id, v_seq, 'planned',
    COALESCE(v_a.company_name, v_a.customer_name),
    v_a.customer_phone,
    v_a.address, v_a.latitude, v_a.longitude,
    NULL, v_a.notes, v_planned_arrival,
    COALESCE(v_a.estimated_duration_minutes, 30),
    v_a.preferred_time_start, v_a.preferred_time_end
  ) RETURNING id INTO v_stop_id;

  UPDATE public.agreement_occurrences SET route_id = _target_route_id WHERE id = v_o.id;
  RETURN v_stop_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._worker_materialize_occurrence(UUID, UUID) FROM PUBLIC;
-- Kun kaldbar fra process_route_materialization_jobs (server-side).

CREATE OR REPLACE FUNCTION public.process_route_materialization_jobs(p_limit INT DEFAULT 25)
RETURNS TABLE(job_id UUID, status TEXT, error TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_stop_id UUID;
  v_backoff INT;
BEGIN
  FOR r IN
    SELECT * FROM public.route_materialization_jobs j
     WHERE j.status = 'pending'
       AND j.next_attempt_at <= now()
       AND j.attempts < j.max_attempts
     ORDER BY j.next_attempt_at ASC
     LIMIT GREATEST(1, p_limit)
     FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.route_materialization_jobs
       SET status = 'running', started_at = now(), attempts = attempts + 1
     WHERE id = r.id;
    BEGIN
      IF r.occurrence_id IS NOT NULL AND r.target_route_id IS NOT NULL THEN
        v_stop_id := public._worker_materialize_occurrence(r.occurrence_id, r.target_route_id);
      ELSE
        RAISE EXCEPTION 'Job % missing occurrence_id or target_route_id', r.id;
      END IF;
      UPDATE public.route_materialization_jobs
         SET status = 'done', completed_at = now(), last_error = NULL
       WHERE id = r.id;
      job_id := r.id; status := 'done'; error := NULL; RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      -- Eksponentiel backoff: 1m, 2m, 4m, 8m, 16m
      v_backoff := LEAST(60 * (1 << GREATEST(0, r.attempts)), 60 * 60);
      IF r.attempts + 1 >= r.max_attempts THEN
        UPDATE public.route_materialization_jobs
           SET status = 'failed', last_error = SQLERRM, completed_at = now()
         WHERE id = r.id;
        job_id := r.id; status := 'failed'; error := SQLERRM; RETURN NEXT;
      ELSE
        UPDATE public.route_materialization_jobs
           SET status = 'pending',
               last_error = SQLERRM,
               next_attempt_at = now() + make_interval(secs => v_backoff),
               started_at = NULL
         WHERE id = r.id;
        job_id := r.id; status := 'retry'; error := SQLERRM; RETURN NEXT;
      END IF;
    END;
  END LOOP;
  RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_route_materialization_jobs(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_route_materialization_jobs(INT) TO service_role;

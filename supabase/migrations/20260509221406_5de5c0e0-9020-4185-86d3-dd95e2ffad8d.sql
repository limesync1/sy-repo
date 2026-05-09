-- Auto-generér forekomster når en aftale oprettes/aktiveres
CREATE OR REPLACE FUNCTION public._generate_occurrences_for_agreement(_agreement_id uuid, _until_date date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_a RECORD;
  v_step int;
  v_date date;
  v_horizon date;
  v_idx int := 0;
  v_inserted int := 0;
BEGIN
  SELECT * INTO v_a FROM public.agreements WHERE id = _agreement_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  IF v_a.status NOT IN ('active','pending_approval') THEN RETURN 0; END IF;

  v_horizon := LEAST(_until_date, current_date + interval '2 years');
  v_step := public.agreement_interval_days(v_a.interval, v_a.interval_days);
  v_date := v_a.start_date;

  IF v_step IS NULL THEN
    IF v_date <= v_horizon AND (v_a.end_date IS NULL OR v_date <= v_a.end_date) THEN
      INSERT INTO public.agreement_occurrences
        (agreement_id, business_id, occurrence_date, sequence_index, employee_ids, planned_arrival)
      VALUES
        (v_a.id, v_a.business_id, v_date, 0, v_a.employee_ids,
         CASE WHEN v_a.preferred_time_start IS NOT NULL
              THEN ((v_date::timestamp + v_a.preferred_time_start) AT TIME ZONE 'Europe/Copenhagen')
              ELSE NULL END)
      ON CONFLICT (agreement_id, occurrence_date) DO NOTHING;
      GET DIAGNOSTICS v_inserted = ROW_COUNT;
    END IF;
    RETURN v_inserted;
  END IF;

  WHILE v_date <= v_horizon LOOP
    EXIT WHEN v_a.end_date IS NOT NULL AND v_date > v_a.end_date;
    INSERT INTO public.agreement_occurrences
      (agreement_id, business_id, occurrence_date, sequence_index, employee_ids, planned_arrival)
    VALUES
      (v_a.id, v_a.business_id, v_date, v_idx, v_a.employee_ids,
       CASE WHEN v_a.preferred_time_start IS NOT NULL
            THEN ((v_date::timestamp + v_a.preferred_time_start) AT TIME ZONE 'Europe/Copenhagen')
            ELSE NULL END)
    ON CONFLICT (agreement_id, occurrence_date) DO NOTHING;
    IF FOUND THEN v_inserted := v_inserted + 1; END IF;
    v_idx := v_idx + 1;
    v_date := v_date + (v_step || ' days')::interval;
  END LOOP;

  RETURN v_inserted;
END;
$$;

-- Trigger-funktion: generér 6 måneder frem ved INSERT eller status-skift til active
CREATE OR REPLACE FUNCTION public.trg_auto_generate_occurrences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public._generate_occurrences_for_agreement(NEW.id, (current_date + interval '6 months')::date);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Hvis aftale aktiveres eller datoer ændres, regenerér
    IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('active','pending_approval'))
       OR OLD.start_date IS DISTINCT FROM NEW.start_date
       OR OLD.interval IS DISTINCT FROM NEW.interval
       OR OLD.interval_days IS DISTINCT FROM NEW.interval_days
       OR OLD.end_date IS DISTINCT FROM NEW.end_date THEN
      PERFORM public._generate_occurrences_for_agreement(NEW.id, (current_date + interval '6 months')::date);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agreement_auto_occurrences ON public.agreements;
CREATE TRIGGER trg_agreement_auto_occurrences
AFTER INSERT OR UPDATE ON public.agreements
FOR EACH ROW EXECUTE FUNCTION public.trg_auto_generate_occurrences();

-- Tilføj unique constraint hvis den ikke findes (forhindrer dubletter)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agreement_occurrences_agreement_date_unique'
  ) THEN
    ALTER TABLE public.agreement_occurrences
      ADD CONSTRAINT agreement_occurrences_agreement_date_unique
      UNIQUE (agreement_id, occurrence_date);
  END IF;
END $$;

-- Backfill: generér forekomster for alle eksisterende aktive aftaler
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.agreements WHERE status IN ('active','pending_approval') LOOP
    PERFORM public._generate_occurrences_for_agreement(r.id, (current_date + interval '6 months')::date);
  END LOOP;
END $$;
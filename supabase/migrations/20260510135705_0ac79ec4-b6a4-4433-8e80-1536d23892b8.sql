CREATE OR REPLACE FUNCTION public.sync_occurrence_from_stop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_route_date date;
  v_agreement_id uuid;
  v_old_date date;
  v_conflict_id uuid;
BEGIN
  IF NEW.agreement_occurrence_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT'
     OR OLD.route_id IS DISTINCT FROM NEW.route_id
     OR OLD.agreement_occurrence_id IS DISTINCT FROM NEW.agreement_occurrence_id
  THEN
    SELECT route_date INTO v_route_date
      FROM public.routes
     WHERE id = NEW.route_id;

    IF v_route_date IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT agreement_id, occurrence_date
      INTO v_agreement_id, v_old_date
      FROM public.agreement_occurrences
     WHERE id = NEW.agreement_occurrence_id;

    IF v_agreement_id IS NULL OR v_old_date = v_route_date THEN
      UPDATE public.agreement_occurrences
         SET route_id = NEW.route_id,
             updated_at = now()
       WHERE id = NEW.agreement_occurrence_id;
      RETURN NEW;
    END IF;

    -- Check for conflicting occurrence on target date for same agreement
    SELECT id INTO v_conflict_id
      FROM public.agreement_occurrences
     WHERE agreement_id = v_agreement_id
       AND occurrence_date = v_route_date
       AND id <> NEW.agreement_occurrence_id
     LIMIT 1;

    IF v_conflict_id IS NOT NULL THEN
      -- Swap: park conflict on a temp sentinel date, then move ours, then place conflict on our old date
      UPDATE public.agreement_occurrences
         SET occurrence_date = DATE '1900-01-01',
             updated_at = now()
       WHERE id = v_conflict_id;

      UPDATE public.agreement_occurrences
         SET route_id = NEW.route_id,
             occurrence_date = v_route_date,
             updated_at = now()
       WHERE id = NEW.agreement_occurrence_id;

      UPDATE public.agreement_occurrences
         SET occurrence_date = v_old_date,
             updated_at = now()
       WHERE id = v_conflict_id;
    ELSE
      UPDATE public.agreement_occurrences
         SET route_id = NEW.route_id,
             occurrence_date = v_route_date,
             updated_at = now()
       WHERE id = NEW.agreement_occurrence_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
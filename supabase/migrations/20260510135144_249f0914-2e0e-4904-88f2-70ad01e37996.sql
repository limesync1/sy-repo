CREATE OR REPLACE FUNCTION public.sync_occurrence_from_stop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_route_date date;
BEGIN
  IF NEW.agreement_occurrence_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- On INSERT or whenever route_id changes, re-sync occurrence
  IF TG_OP = 'INSERT'
     OR OLD.route_id IS DISTINCT FROM NEW.route_id
     OR OLD.agreement_occurrence_id IS DISTINCT FROM NEW.agreement_occurrence_id
  THEN
    SELECT route_date INTO v_route_date
      FROM public.routes
     WHERE id = NEW.route_id;

    IF v_route_date IS NOT NULL THEN
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

DROP TRIGGER IF EXISTS trg_sync_occurrence_from_stop ON public.route_stops;
CREATE TRIGGER trg_sync_occurrence_from_stop
AFTER INSERT OR UPDATE OF route_id, agreement_occurrence_id ON public.route_stops
FOR EACH ROW
EXECUTE FUNCTION public.sync_occurrence_from_stop();
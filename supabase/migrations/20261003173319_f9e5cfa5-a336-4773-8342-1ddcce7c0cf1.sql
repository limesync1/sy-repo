CREATE OR REPLACE FUNCTION public.revert_completion_on_undo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order uuid;
BEGIN
  IF OLD.status IS DISTINCT FROM 'completed' OR NEW.status = 'completed' THEN
    RETURN NEW;
  END IF;

  IF NEW.agreement_occurrence_id IS NOT NULL THEN
    UPDATE public.agreement_occurrences
       SET status = DEFAULT, completed_at = NULL, updated_at = now()
     WHERE id = NEW.agreement_occurrence_id AND status = 'completed';
    SELECT COALESCE(NEW.order_id, legacy_order_id) INTO v_order
      FROM public.agreement_occurrences WHERE id = NEW.agreement_occurrence_id;
  ELSE
    v_order := NEW.order_id;
  END IF;

  IF v_order IS NOT NULL THEN
    UPDATE public.orders
       SET completed_cycles = GREATEST(COALESCE(completed_cycles, 0) - 1, 0),
           updated_at = now()
     WHERE id = v_order;
  END IF;

  DELETE FROM public.employee_completed_stops WHERE stop_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_revert_completion_on_undo ON public.route_stops;
CREATE TRIGGER trg_revert_completion_on_undo
AFTER UPDATE OF status ON public.route_stops
FOR EACH ROW EXECUTE FUNCTION public.revert_completion_on_undo();
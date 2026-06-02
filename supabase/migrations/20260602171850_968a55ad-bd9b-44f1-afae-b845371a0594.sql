
-- Forhindrer spøgelses-/dublet-stop på tværs af ruter på samme dato.
-- Eksisterende unique indexes dækker kun (route_id, X) — så samme aftale/abo/occurrence
-- kunne lande på to forskellige ruter samme dag. Denne trigger lukker hullet.

CREATE OR REPLACE FUNCTION public.prevent_duplicate_route_stops_cross_route()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_route_date date;
  v_conflict_route uuid;
BEGIN
  SELECT business_id, route_date INTO v_business_id, v_route_date
  FROM public.routes
  WHERE id = NEW.route_id
    AND archived_at IS NULL
    AND deleted_at IS NULL;

  -- Hvis target-rute er slettet/arkiveret eller ikke findes, lad andre constraints håndtere det.
  IF v_business_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.order_id IS NOT NULL THEN
    SELECT rs.route_id INTO v_conflict_route
    FROM public.route_stops rs
    JOIN public.routes r ON r.id = rs.route_id
    WHERE rs.order_id = NEW.order_id
      AND rs.route_id <> NEW.route_id
      AND r.business_id = v_business_id
      AND r.route_date = v_route_date
      AND r.archived_at IS NULL
      AND r.deleted_at IS NULL
    LIMIT 1;
    IF v_conflict_route IS NOT NULL THEN
      RAISE EXCEPTION 'duplicate_route_stop_order: order_id % findes allerede på rute % samme dato (%)',
        NEW.order_id, v_conflict_route, v_route_date
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  IF NEW.subscription_id IS NOT NULL THEN
    SELECT rs.route_id INTO v_conflict_route
    FROM public.route_stops rs
    JOIN public.routes r ON r.id = rs.route_id
    WHERE rs.subscription_id = NEW.subscription_id
      AND rs.route_id <> NEW.route_id
      AND r.business_id = v_business_id
      AND r.route_date = v_route_date
      AND r.archived_at IS NULL
      AND r.deleted_at IS NULL
    LIMIT 1;
    IF v_conflict_route IS NOT NULL THEN
      RAISE EXCEPTION 'duplicate_route_stop_subscription: subscription_id % findes allerede på rute % samme dato (%)',
        NEW.subscription_id, v_conflict_route, v_route_date
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  IF NEW.agreement_occurrence_id IS NOT NULL THEN
    SELECT rs.route_id INTO v_conflict_route
    FROM public.route_stops rs
    JOIN public.routes r ON r.id = rs.route_id
    WHERE rs.agreement_occurrence_id = NEW.agreement_occurrence_id
      AND rs.route_id <> NEW.route_id
      AND r.business_id = v_business_id
      AND r.route_date = v_route_date
      AND r.archived_at IS NULL
      AND r.deleted_at IS NULL
    LIMIT 1;
    IF v_conflict_route IS NOT NULL THEN
      RAISE EXCEPTION 'duplicate_route_stop_occurrence: agreement_occurrence_id % findes allerede på rute % samme dato (%)',
        NEW.agreement_occurrence_id, v_conflict_route, v_route_date
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_route_stops_cross_route ON public.route_stops;
CREATE TRIGGER trg_prevent_duplicate_route_stops_cross_route
BEFORE INSERT OR UPDATE OF route_id, order_id, subscription_id, agreement_occurrence_id
ON public.route_stops
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_route_stops_cross_route();

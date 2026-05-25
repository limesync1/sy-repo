
-- 1. Soft-delete kolonner FØRST
ALTER TABLE public.routes
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_routes_archived_at ON public.routes(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_routes_deleted_at  ON public.routes(deleted_at)  WHERE deleted_at  IS NOT NULL;

-- 2. Cleanup FØR triggers installeres — så vi ikke blokerer os selv.
--    Fjern stops på fremtidige skygge-ruter (rene projektion-kopier).
DELETE FROM public.route_stops
WHERE route_id IN (
  SELECT r.id FROM public.routes r
  WHERE r.base_route_id IS NOT NULL
    AND r.route_date > CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM public.route_stops s
      WHERE s.route_id = r.id
        AND s.status IN ('completed','in_progress')
    )
);

-- Fjern derefter selve skygge-ruterne.
DELETE FROM public.routes r
WHERE r.base_route_id IS NOT NULL
  AND r.route_date > CURRENT_DATE
  AND NOT EXISTS (
    SELECT 1 FROM public.route_stops s
    WHERE s.route_id = r.id
  );

-- 3. Guard: forbyd hard-delete af rute med stops (kræv soft-delete)
CREATE OR REPLACE FUNCTION public.guard_route_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stop_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO stop_count FROM public.route_stops WHERE route_id = OLD.id;
  IF stop_count > 0 THEN
    RAISE EXCEPTION 'Kan ikke slette rute % – ruten har % stop(s). Arkivér ruten i stedet.', OLD.id, stop_count
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_route_hard_delete ON public.routes;
CREATE TRIGGER trg_guard_route_hard_delete
  BEFORE DELETE ON public.routes
  FOR EACH ROW EXECUTE FUNCTION public.guard_route_hard_delete();

-- 4. Guard: arkiverede ruter må ikke ændres (kun un-archive er tilladt)
CREATE OR REPLACE FUNCTION public.guard_archived_route_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.archived_at IS NOT NULL
     AND NEW.archived_at IS NOT NULL
     AND (OLD.route_date IS DISTINCT FROM NEW.route_date
       OR OLD.employee_id IS DISTINCT FROM NEW.employee_id
       OR OLD.status IS DISTINCT FROM NEW.status) THEN
    RAISE EXCEPTION 'Rute % er arkiveret og kan ikke ændres. Gendan den først.', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_archived_route_update ON public.routes;
CREATE TRIGGER trg_guard_archived_route_update
  BEFORE UPDATE ON public.routes
  FOR EACH ROW EXECUTE FUNCTION public.guard_archived_route_update();

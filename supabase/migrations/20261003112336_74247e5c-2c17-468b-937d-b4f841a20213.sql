-- En aftale må kun ligge på én fast rute ad gangen. Seneste placering vinder,
-- og en fast rute der derved bliver tom arkiveres (og frakobles sine kopier).
CREATE OR REPLACE FUNCTION public.dedupe_order_across_fixed_routes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _biz uuid;
  _is_fixed boolean;
  _old record;
BEGIN
  IF NEW.order_id IS NULL THEN RETURN NEW; END IF;
  SELECT business_id, (base_route_id IS NULL) INTO _biz, _is_fixed
  FROM routes WHERE id = NEW.route_id AND deleted_at IS NULL AND archived_at IS NULL;
  IF NOT coalesce(_is_fixed, false) THEN RETURN NEW; END IF;

  FOR _old IN
    SELECT s.id, s.route_id FROM route_stops s
    JOIN routes r ON r.id = s.route_id
    WHERE s.order_id = NEW.order_id AND s.id <> NEW.id
      AND r.business_id = _biz AND r.base_route_id IS NULL
      AND r.id <> NEW.route_id
      AND r.deleted_at IS NULL AND r.archived_at IS NULL
      AND coalesce(s.status, 'pending') NOT IN ('completed','skipped')
  LOOP
    DELETE FROM route_stops WHERE id = _old.id;
    IF NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id = _old.route_id) THEN
      UPDATE routes SET base_route_id = NULL WHERE base_route_id = _old.route_id;
      UPDATE routes SET archived_at = now() WHERE id = _old.route_id;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dedupe_order_fixed_routes ON public.route_stops;
CREATE TRIGGER trg_dedupe_order_fixed_routes
AFTER INSERT OR UPDATE OF route_id, order_id ON public.route_stops
FOR EACH ROW EXECUTE FUNCTION public.dedupe_order_across_fixed_routes();

-- Ryd den eksisterende dublet hos DK Renfyn: samme aftale lå på to faste ruter.
DELETE FROM public.route_stops WHERE id IN ('95e159f4-429e-4037-aaec-18bf42c9178c','c9c5b4e1-06d3-4c6c-8eb9-71b92c78b852');
UPDATE public.routes SET base_route_id = 'ed089200-f408-491f-b97e-8dd65bc8a3ff' WHERE id = '5e20986e-0aef-413a-bff0-5ccf310b9293';
UPDATE public.routes SET archived_at = now() WHERE id = '629ff7c9-d7ef-4476-95ec-1c2b84fccc97'
  AND NOT EXISTS (SELECT 1 FROM public.route_stops WHERE route_id = '629ff7c9-d7ef-4476-95ec-1c2b84fccc97');
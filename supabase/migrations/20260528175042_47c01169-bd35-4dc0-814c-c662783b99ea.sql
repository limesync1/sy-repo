-- 1) Backfill: dedupe existing route names on the same day
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY business_id, route_date, lower(btrim(name))
      ORDER BY created_at, id
    ) AS rn
  FROM public.routes
  WHERE name IS NOT NULL
    AND btrim(name) <> ''
    AND archived_at IS NULL
    AND deleted_at IS NULL
)
UPDATE public.routes r
SET name = r.name || ' (' || ranked.rn || ')'
FROM ranked
WHERE ranked.id = r.id
  AND ranked.rn > 1;

-- 2) Helper: return a unique name for (business_id, route_date)
CREATE OR REPLACE FUNCTION public._unique_route_name(
  _business_id uuid,
  _route_date date,
  _name text,
  _ignore_route_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base text := btrim(_name);
  v_candidate text;
  v_n int := 1;
BEGIN
  IF v_base IS NULL OR v_base = '' THEN
    RETURN _name;
  END IF;
  v_candidate := v_base;
  WHILE EXISTS (
    SELECT 1 FROM public.routes
    WHERE business_id = _business_id
      AND route_date = _route_date
      AND archived_at IS NULL
      AND deleted_at IS NULL
      AND name IS NOT NULL
      AND lower(btrim(name)) = lower(v_candidate)
      AND (_ignore_route_id IS NULL OR id <> _ignore_route_id)
  ) LOOP
    v_n := v_n + 1;
    v_candidate := v_base || ' (' || v_n || ')';
  END LOOP;
  RETURN v_candidate;
END;
$$;

-- 3) BEFORE INSERT trigger: silently auto-suffix names from automated paths
CREATE OR REPLACE FUNCTION public._routes_dedupe_name_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.name IS NOT NULL AND btrim(NEW.name) <> ''
     AND NEW.archived_at IS NULL AND NEW.deleted_at IS NULL THEN
    NEW.name := public._unique_route_name(NEW.business_id, NEW.route_date, NEW.name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS routes_dedupe_name_on_insert ON public.routes;
CREATE TRIGGER routes_dedupe_name_on_insert
BEFORE INSERT ON public.routes
FOR EACH ROW
EXECUTE FUNCTION public._routes_dedupe_name_on_insert();

-- 4) Hard guarantee: partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS routes_unique_name_per_business_date
ON public.routes (business_id, route_date, lower(btrim(name)))
WHERE name IS NOT NULL
  AND btrim(name) <> ''
  AND archived_at IS NULL
  AND deleted_at IS NULL;
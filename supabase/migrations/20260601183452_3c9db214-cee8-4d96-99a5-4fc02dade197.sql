-- Cleanup ghost routes: empty materialized child routes, soft-deleted routes,
-- and stale "moved" exceptions whose target route no longer exists.
CREATE OR REPLACE FUNCTION public.cleanup_ghost_routes()
RETURNS TABLE(
  deleted_empty_children integer,
  deleted_soft_deleted integer,
  deleted_stale_exceptions integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empty integer := 0;
  v_soft integer := 0;
  v_excs integer := 0;
BEGIN
  -- 1) Hard-delete soft-deleted routes older than 1 day (only if no stops left)
  WITH del AS (
    DELETE FROM public.routes r
    WHERE r.deleted_at IS NOT NULL
      AND r.deleted_at < now() - interval '1 day'
      AND NOT EXISTS (SELECT 1 FROM public.route_stops s WHERE s.route_id = r.id)
    RETURNING 1
  ) SELECT count(*) INTO v_soft FROM del;

  -- 2) Delete empty materialized children of a base route (ghost projections)
  --    keep base routes intact even if empty (they anchor recurring series)
  WITH del AS (
    DELETE FROM public.routes r
    WHERE r.base_route_id IS NOT NULL
      AND r.archived_at IS NULL
      AND r.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.route_stops s WHERE s.route_id = r.id)
      AND r.created_at < now() - interval '15 minutes'
    RETURNING 1
  ) SELECT count(*) INTO v_empty FROM del;

  -- 3) Delete "moved" occurrence exceptions whose replacement route is gone
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='route_occurrence_exceptions'
      AND column_name='replacement_route_id'
  ) THEN
    EXECUTE $sql$
      WITH del AS (
        DELETE FROM public.route_occurrence_exceptions e
        WHERE e.replacement_route_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM public.routes r WHERE r.id = e.replacement_route_id)
        RETURNING 1
      ) SELECT count(*) FROM del
    $sql$ INTO v_excs;
  END IF;

  RETURN QUERY SELECT v_empty, v_soft, v_excs;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_ghost_routes() TO service_role;

DO $$
DECLARE
  v_id uuid;
BEGIN
  FOR v_id IN
    SELECT DISTINCT r.id
    FROM public.routes r
    WHERE r.base_route_id IS NULL
      AND r.archived_at IS NULL
      AND r.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.agreements a
          WHERE a.preferred_route_id = r.id
            AND a.status = 'active'
            AND a.interval <> 'engangskøb'
        )
        OR EXISTS (
          SELECT 1 FROM public.subscriptions s
          WHERE s.preferred_route_id = r.id
            AND s.status = 'active'
            AND COALESCE(s.details->>'interval', s.interval) IS NOT NULL
            AND COALESCE(s.details->>'interval', s.interval) <> 'engangskøb'
        )
      )
  LOOP
    BEGIN
      PERFORM public.materialize_next_occurrence_for_base_route(v_id);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END;
$$;
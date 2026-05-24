WITH ghost_routes AS (
  SELECT r.id
  FROM public.routes r
  WHERE r.route_date >= CURRENT_DATE
    AND NOT EXISTS (SELECT 1 FROM public.route_stops rs WHERE rs.route_id = r.id)
    AND (
      r.base_route_id IS NOT NULL
      OR EXISTS (
        SELECT 1
        FROM public.agreements a
        WHERE a.business_id = r.business_id
          AND a.status = 'active'
          AND a.preferred_route_id = r.id
          AND a.interval::text <> 'engangskøb'
      )
      OR EXISTS (
        SELECT 1
        FROM public.subscriptions s
        WHERE s.business_id = r.business_id
          AND s.status = 'active'
          AND s.preferred_route_id = r.id
          AND COALESCE(s.interval::text, '') <> 'engangskøb'
      )
    )
), deleted_exceptions AS (
  DELETE FROM public.route_occurrence_exceptions e
  USING ghost_routes g
  WHERE e.replacement_route_id = g.id OR e.base_route_id = g.id
  RETURNING e.id
)
DELETE FROM public.routes r
USING ghost_routes g
WHERE r.id = g.id;
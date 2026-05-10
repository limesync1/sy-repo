-- Move stops to a specific target route (preserves employee info via stops; appends to end)
CREATE OR REPLACE FUNCTION public.move_stops_to_route(
  _stop_ids uuid[],
  _target_route_id uuid
) RETURNS TABLE(moved_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_target_business uuid;
  v_seq int;
  v_moved int := 0;
BEGIN
  SELECT business_id INTO v_target_business
    FROM public.routes WHERE id = _target_route_id;

  IF v_target_business IS NULL THEN
    RAISE EXCEPTION 'Målrute findes ikke';
  END IF;

  SELECT COALESCE(MAX(sequence), -1) INTO v_seq
    FROM public.route_stops WHERE route_id = _target_route_id;

  -- Kun stops fra samme business og ikke allerede på målruten
  WITH eligible AS (
    SELECT rs.id,
           ROW_NUMBER() OVER (ORDER BY rs.sequence NULLS LAST, rs.created_at) AS rn
      FROM public.route_stops rs
      JOIN public.routes r ON r.id = rs.route_id
     WHERE rs.id = ANY(_stop_ids)
       AND r.business_id = v_target_business
       AND rs.route_id <> _target_route_id
  )
  UPDATE public.route_stops rs
     SET route_id = _target_route_id,
         sequence = v_seq + e.rn,
         planned_arrival = NULL
    FROM eligible e
   WHERE rs.id = e.id;

  GET DIAGNOSTICS v_moved = ROW_COUNT;
  RETURN QUERY SELECT v_moved;
END;
$$;

GRANT EXECUTE ON FUNCTION public.move_stops_to_route(uuid[], uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.move_stops_to_route(_stop_ids uuid[], _target_route_id uuid)
 RETURNS TABLE(moved_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

  -- Identificér source-stops der ville kollidere med eksisterende stops
  -- på målruten (samme order_id, subscription_id eller agreement_occurrence_id).
  -- Disse repræsenterer DEN SAMME aftale og må aldrig duplikeres — vi
  -- sletter source-rækken i stedet for at flytte den.
  WITH src AS (
    SELECT rs.id, rs.order_id, rs.subscription_id, rs.agreement_occurrence_id
      FROM public.route_stops rs
      JOIN public.routes r ON r.id = rs.route_id
     WHERE rs.id = ANY(_stop_ids)
       AND r.business_id = v_target_business
       AND rs.route_id <> _target_route_id
  ),
  conflicting AS (
    SELECT s.id
      FROM src s
     WHERE EXISTS (
       SELECT 1 FROM public.route_stops t
        WHERE t.route_id = _target_route_id
          AND (
            (s.order_id IS NOT NULL AND t.order_id = s.order_id)
            OR (s.subscription_id IS NOT NULL AND t.subscription_id = s.subscription_id)
            OR (s.agreement_occurrence_id IS NOT NULL AND t.agreement_occurrence_id = s.agreement_occurrence_id)
          )
     )
  )
  DELETE FROM public.route_stops WHERE id IN (SELECT id FROM conflicting);

  -- Flyt resterende stops til målruten med fortløbende sequence.
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
$function$;
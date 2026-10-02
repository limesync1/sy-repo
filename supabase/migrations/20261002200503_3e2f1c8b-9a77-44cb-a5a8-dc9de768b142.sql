CREATE OR REPLACE FUNCTION public.merge_routes(_source uuid, _target uuid, _scope text DEFAULT 'single')
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _s public.routes%ROWTYPE; _t public.routes%ROWTYPE; _caller uuid := auth.uid();
  _next_seq integer; _moved integer := 0; _left integer; _refs integer; _archived boolean := false;
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE='28000'; END IF;
  IF _scope NOT IN ('single','future') THEN RAISE EXCEPTION 'INVALID_SCOPE' USING ERRCODE='22023'; END IF;
  IF _source = _target THEN RAISE EXCEPTION 'SAME_ROUTE' USING ERRCODE='22023'; END IF;
  SELECT * INTO _s FROM public.routes WHERE id=_source FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ROUTE_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  SELECT * INTO _t FROM public.routes WHERE id=_target FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ROUTE_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF _s.business_id <> _t.business_id THEN RAISE EXCEPTION 'DIFFERENT_BUSINESS' USING ERRCODE='42501'; END IF;
  IF _s.archived_at IS NOT NULL OR _s.deleted_at IS NOT NULL OR _t.archived_at IS NOT NULL OR _t.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'ROUTE_ARCHIVED' USING ERRCODE='22023'; END IF;
  IF NOT public.has_role(_caller,'admin') AND NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id=_s.business_id AND b.owner_id=_caller) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED' USING ERRCODE='42501'; END IF;

  SELECT COALESCE(MAX(sequence),0) INTO _next_seq FROM public.route_stops WHERE route_id=_target;
  WITH o AS (SELECT id, row_number() OVER (ORDER BY sequence, created_at) rn FROM public.route_stops WHERE route_id=_source),
  u AS (UPDATE public.route_stops rs SET route_id=_target, sequence=_next_seq+o.rn, updated_at=now() FROM o WHERE rs.id=o.id RETURNING rs.id)
  SELECT count(*) INTO _moved FROM u;

  IF _scope='future' THEN
    UPDATE public.subscriptions s SET preferred_route_id=_target,
      next_service_date = CASE WHEN s.next_service_date IS NOT NULL THEN s.next_service_date + (_t.route_date-_s.route_date) END, updated_at=now()
    WHERE s.preferred_route_id=_source AND s.status='active' AND s.interval <> 'engangskøb';
    UPDATE public.agreements a SET preferred_route_id=_target,
      start_date = CASE WHEN a.start_date IS NOT NULL THEN a.start_date + (_t.route_date-_s.route_date) END, updated_at=now()
    WHERE a.preferred_route_id=_source AND a.status='active' AND a.interval <> 'engangskøb';
  END IF;

  SELECT count(*) INTO _left FROM public.route_stops WHERE route_id=_source;
  SELECT (SELECT count(*) FROM public.agreements WHERE preferred_route_id=_source AND status='active' AND interval <> 'engangskøb')
       + (SELECT count(*) FROM public.subscriptions WHERE preferred_route_id=_source AND status='active' AND interval <> 'engangskøb') INTO _refs;
  IF _left=0 AND _refs=0 THEN
    UPDATE public.routes SET archived_at=now(), updated_at=now() WHERE id=_source; _archived := true;
  END IF;

  BEGIN
    INSERT INTO public.route_audit_log (business_id, actor_id, action, route_id, scope, affected_count, summary, before_data, after_data)
    VALUES (_s.business_id, _caller, 'route.merge', _target, _scope, _moved,
      format('Flettede %s aftale(r) fra "%s" ind i "%s"', _moved, _s.name, _t.name),
      jsonb_build_object('source_route_id',_source), jsonb_build_object('target_route_id',_target,'moved',_moved,'source_archived',_archived));
  EXCEPTION WHEN others THEN NULL;
  END;

  RETURN json_build_object('moved',_moved,'source_archived',_archived,'source_kept',(_left=0 AND NOT _archived),'recurring_refs',_refs);
END; $$;
REVOKE ALL ON FUNCTION public.merge_routes(uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_routes(uuid,uuid,text) TO authenticated;
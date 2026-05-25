-- Fase 8: automatisk audit-logging via triggere
CREATE OR REPLACE FUNCTION public.audit_route_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_business_id uuid;
  v_route_id uuid;
  v_before jsonb;
  v_after jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := TG_TABLE_NAME || '.insert';
    v_before := NULL;
    v_after := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := TG_TABLE_NAME || '.update';
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);
    -- Skip no-op updates
    IF v_before = v_after THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := TG_TABLE_NAME || '.delete';
    v_before := to_jsonb(OLD);
    v_after := NULL;
  END IF;

  -- Resolve business_id + route_id depending on table
  IF TG_TABLE_NAME = 'routes' THEN
    v_business_id := COALESCE((v_after->>'business_id')::uuid, (v_before->>'business_id')::uuid);
    v_route_id := COALESCE((v_after->>'id')::uuid, (v_before->>'id')::uuid);
  ELSIF TG_TABLE_NAME = 'route_stops' THEN
    v_route_id := COALESCE((v_after->>'route_id')::uuid, (v_before->>'route_id')::uuid);
    SELECT business_id INTO v_business_id FROM public.routes WHERE id = v_route_id;
  ELSIF TG_TABLE_NAME = 'route_occurrence_exceptions' THEN
    v_business_id := COALESCE((v_after->>'business_id')::uuid, (v_before->>'business_id')::uuid);
    v_route_id := COALESCE((v_after->>'base_route_id')::uuid, (v_before->>'base_route_id')::uuid);
  END IF;

  IF v_business_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO public.route_audit_log (
    business_id, actor_id, route_id, action, scope, before_data, after_data
  ) VALUES (
    v_business_id, auth.uid(), v_route_id, v_action, 'trigger', v_before, v_after
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_routes ON public.routes;
CREATE TRIGGER trg_audit_routes
  AFTER INSERT OR UPDATE OR DELETE ON public.routes
  FOR EACH ROW EXECUTE FUNCTION public.audit_route_change();

DROP TRIGGER IF EXISTS trg_audit_route_stops ON public.route_stops;
CREATE TRIGGER trg_audit_route_stops
  AFTER INSERT OR UPDATE OR DELETE ON public.route_stops
  FOR EACH ROW EXECUTE FUNCTION public.audit_route_change();

DROP TRIGGER IF EXISTS trg_audit_route_exceptions ON public.route_occurrence_exceptions;
CREATE TRIGGER trg_audit_route_exceptions
  AFTER INSERT OR UPDATE OR DELETE ON public.route_occurrence_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.audit_route_change();
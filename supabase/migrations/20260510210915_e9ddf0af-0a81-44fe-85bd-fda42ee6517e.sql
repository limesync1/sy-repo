CREATE TABLE IF NOT EXISTS public.route_planner_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error')),
  base_route_id uuid REFERENCES public.routes(id) ON DELETE SET NULL,
  route_id uuid REFERENCES public.routes(id) ON DELETE SET NULL,
  projected_date date,
  client_event_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_route_planner_events_business_created
  ON public.route_planner_events (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_route_planner_events_type_created
  ON public.route_planner_events (event_type, created_at DESC);

ALTER TABLE public.route_planner_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view route planner events" ON public.route_planner_events;
CREATE POLICY "Admins view route planner events"
ON public.route_planner_events
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Owners view route planner events" ON public.route_planner_events;
CREATE POLICY "Owners view route planner events"
ON public.route_planner_events
FOR SELECT
USING (public.is_business_owner(business_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.open_projected_route_base(
  _business_id uuid,
  _base_route_id uuid,
  _projected_date date,
  _client_event_id text DEFAULT NULL
)
RETURNS public.routes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base public.routes%ROWTYPE;
  v_materialized_count integer := 0;
BEGIN
  SELECT * INTO v_base
  FROM public.routes
  WHERE id = _base_route_id
    AND business_id = _business_id;

  IF NOT FOUND THEN
    INSERT INTO public.route_planner_events (
      business_id, event_type, severity, base_route_id, projected_date, client_event_id, details
    ) VALUES (
      _business_id,
      'projected_route_open_missing_base',
      'error',
      _base_route_id,
      _projected_date,
      _client_event_id,
      jsonb_build_object('reason', 'base route not found')
    );
    RAISE EXCEPTION 'Basisruten findes ikke længere';
  END IF;

  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_business_owner(_business_id, auth.uid())) THEN
    RAISE EXCEPTION 'Adgang nægtet';
  END IF;

  SELECT COUNT(*) INTO v_materialized_count
  FROM public.routes
  WHERE business_id = _business_id
    AND base_route_id = _base_route_id
    AND route_date = _projected_date;

  INSERT INTO public.route_planner_events (
    business_id, event_type, severity, base_route_id, route_id, projected_date, client_event_id, details
  ) VALUES (
    _business_id,
    CASE WHEN v_materialized_count > 0 THEN 'projected_route_open_existing_materialization' ELSE 'projected_route_opened_base' END,
    CASE WHEN v_materialized_count > 0 THEN 'warning' ELSE 'info' END,
    _base_route_id,
    v_base.id,
    _projected_date,
    _client_event_id,
    jsonb_build_object(
      'materialized_count_before_open', v_materialized_count,
      'guarantee', 'open_only_no_route_insert'
    )
  );

  RETURN v_base;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_route_materialization_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_count integer := 0;
BEGIN
  IF NEW.base_route_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_existing_count
  FROM public.routes
  WHERE business_id = NEW.business_id
    AND base_route_id = NEW.base_route_id
    AND route_date = NEW.route_date
    AND id <> NEW.id;

  IF v_existing_count > 0 THEN
    INSERT INTO public.route_planner_events (
      business_id, event_type, severity, base_route_id, route_id, projected_date, details
    ) VALUES (
      NEW.business_id,
      'duplicate_materialized_route_attempt',
      'error',
      NEW.base_route_id,
      NEW.id,
      NEW.route_date,
      jsonb_build_object('existing_count', v_existing_count)
    );
  ELSE
    INSERT INTO public.route_planner_events (
      business_id, event_type, severity, base_route_id, route_id, projected_date, details
    ) VALUES (
      NEW.business_id,
      'route_materialized_explicitly',
      'info',
      NEW.base_route_id,
      NEW.id,
      NEW.route_date,
      jsonb_build_object('source', 'explicit_materialization')
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS route_materialization_event_trigger ON public.routes;
CREATE TRIGGER route_materialization_event_trigger
AFTER INSERT ON public.routes
FOR EACH ROW
WHEN (NEW.base_route_id IS NOT NULL)
EXECUTE FUNCTION public.log_route_materialization_event();
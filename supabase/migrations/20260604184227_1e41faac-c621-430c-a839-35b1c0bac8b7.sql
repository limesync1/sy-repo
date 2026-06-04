
CREATE TABLE IF NOT EXISTS public.route_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL,
  business_id uuid NOT NULL,
  snapshot_date date NOT NULL,
  payload jsonb NOT NULL,
  reason text NOT NULL DEFAULT 'locked',
  locked_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (route_id, snapshot_date, reason)
);

CREATE INDEX IF NOT EXISTS idx_route_snapshots_business_date
  ON public.route_snapshots (business_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_route_snapshots_route
  ON public.route_snapshots (route_id, locked_at DESC);

GRANT SELECT, INSERT ON public.route_snapshots TO authenticated;
GRANT ALL ON public.route_snapshots TO service_role;

ALTER TABLE public.route_snapshots ENABLE ROW LEVEL SECURITY;

-- Adgang: business-ejer eller en aktiv medarbejder i samme business.
CREATE POLICY "biz_members_can_read_route_snapshots"
ON public.route_snapshots
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = route_snapshots.business_id AND b.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.business_id = route_snapshots.business_id
      AND e.user_id = auth.uid()
      AND e.is_active = true
  )
);

CREATE POLICY "biz_members_can_insert_route_snapshots"
ON public.route_snapshots
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = route_snapshots.business_id AND b.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.business_id = route_snapshots.business_id
      AND e.user_id = auth.uid()
      AND e.is_active = true
  )
);

-- Snapshot-helper: pakker en rute + dens stops i én jsonb-payload.
CREATE OR REPLACE FUNCTION public.snapshot_route(
  _route_id uuid,
  _reason text DEFAULT 'locked'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _route record;
  _payload jsonb;
  _id uuid;
BEGIN
  SELECT r.id, r.business_id, r.route_date, r.name, r.color, r.status,
         r.assigned_employee_id, r.notes
    INTO _route
  FROM public.routes r
  WHERE r.id = _route_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'route % not found', _route_id USING ERRCODE = 'no_data_found';
  END IF;

  SELECT jsonb_build_object(
    'route', to_jsonb(_route),
    'stops', COALESCE((
      SELECT jsonb_agg(to_jsonb(s) ORDER BY s.sequence)
      FROM public.route_stops s
      WHERE s.route_id = _route_id
    ), '[]'::jsonb),
    'snapshotted_at', now()
  ) INTO _payload;

  INSERT INTO public.route_snapshots (route_id, business_id, snapshot_date, payload, reason, created_by)
  VALUES (_route_id, _route.business_id, _route.route_date, _payload, _reason, auth.uid())
  ON CONFLICT (route_id, snapshot_date, reason) DO NOTHING
  RETURNING id INTO _id;

  IF _id IS NOT NULL THEN
    BEGIN
      PERFORM public.log_route_event(
        'route',
        _route_id::text,
        'ROUTE_SNAPSHOTTED',
        jsonb_build_object('snapshot_id', _id, 'reason', _reason, 'date', _route.route_date)
      );
    EXCEPTION WHEN undefined_function THEN
      -- Event-log endnu ikke deployet i dette miljø; snapshot er stadig skrevet.
      NULL;
    END;
  END IF;

  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.snapshot_route(uuid, text) TO authenticated, service_role;

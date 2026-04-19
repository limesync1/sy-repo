
-- 1) Add required_staff to route_stops
ALTER TABLE public.route_stops
  ADD COLUMN IF NOT EXISTS required_staff smallint NOT NULL DEFAULT 1;

-- 2) Junction table for multi-employee assignment per stop
CREATE TABLE IF NOT EXISTS public.route_stop_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stop_id uuid NOT NULL REFERENCES public.route_stops(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  is_lead boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stop_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_route_stop_assignees_stop ON public.route_stop_assignees(stop_id);
CREATE INDEX IF NOT EXISTS idx_route_stop_assignees_employee ON public.route_stop_assignees(employee_id);

-- 3) Backfill from existing assigned_employee_id
INSERT INTO public.route_stop_assignees (stop_id, employee_id, is_lead)
SELECT id, assigned_employee_id, true
FROM public.route_stops
WHERE assigned_employee_id IS NOT NULL
ON CONFLICT (stop_id, employee_id) DO NOTHING;

-- 4) Enable RLS
ALTER TABLE public.route_stop_assignees ENABLE ROW LEVEL SECURITY;

-- 5) RLS policies mirroring route_stops
CREATE POLICY "Admins manage all stop assignees"
  ON public.route_stop_assignees
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Business owners manage their stop assignees"
  ON public.route_stop_assignees
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.route_stops rs
      JOIN public.routes r ON r.id = rs.route_id
      JOIN public.businesses b ON b.id = r.business_id
      WHERE rs.id = route_stop_assignees.stop_id AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.route_stops rs
      JOIN public.routes r ON r.id = rs.route_id
      JOIN public.businesses b ON b.id = r.business_id
      WHERE rs.id = route_stop_assignees.stop_id AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY "Employees view their stop assignments"
  ON public.route_stop_assignees
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = route_stop_assignees.employee_id AND e.user_id = auth.uid()
    )
  );

-- 6) Trigger: keep assigned_employee_id in sync with the lead assignee (back-compat)
CREATE OR REPLACE FUNCTION public.sync_stop_lead_assignee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stop_id uuid;
  v_lead uuid;
BEGIN
  v_stop_id := COALESCE(NEW.stop_id, OLD.stop_id);

  SELECT employee_id INTO v_lead
  FROM public.route_stop_assignees
  WHERE stop_id = v_stop_id
  ORDER BY is_lead DESC, created_at ASC
  LIMIT 1;

  UPDATE public.route_stops
     SET assigned_employee_id = v_lead,
         updated_at = now()
   WHERE id = v_stop_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_lead_assignee_iud ON public.route_stop_assignees;
CREATE TRIGGER trg_sync_lead_assignee_iud
AFTER INSERT OR UPDATE OR DELETE ON public.route_stop_assignees
FOR EACH ROW EXECUTE FUNCTION public.sync_stop_lead_assignee();

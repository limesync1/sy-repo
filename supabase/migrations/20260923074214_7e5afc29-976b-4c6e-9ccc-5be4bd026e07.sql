GRANT SELECT, INSERT, UPDATE, DELETE ON public.route_live_positions TO authenticated;

CREATE POLICY "Employees create own assigned route position"
ON public.route_live_positions
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_id
      AND e.user_id = auth.uid()
      AND e.business_id = route_live_positions.business_id
      AND e.is_active IS DISTINCT FROM false
  )
  AND EXISTS (
    SELECT 1 FROM public.routes r
    LEFT JOIN public.route_employees re ON re.route_id = r.id AND re.employee_id = route_live_positions.employee_id
    WHERE r.id = route_id
      AND r.business_id = route_live_positions.business_id
      AND r.deleted_at IS NULL
      AND (
        r.employee_id = route_live_positions.employee_id
        OR re.employee_id IS NOT NULL
        OR EXISTS (
          SELECT 1 FROM public.route_stops rs
          JOIN public.route_stop_assignees rsa ON rsa.stop_id = rs.id
          WHERE rs.route_id = r.id AND rsa.employee_id = route_live_positions.employee_id
        )
      )
  )
  AND (current_stop_id IS NULL OR EXISTS (
    SELECT 1 FROM public.route_stops rs WHERE rs.id = current_stop_id AND rs.route_id = route_id
  ))
);

CREATE POLICY "Employees update own assigned route position"
ON public.route_live_positions
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.employees e
  WHERE e.id = employee_id AND e.user_id = auth.uid()
))
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_id
      AND e.user_id = auth.uid()
      AND e.business_id = route_live_positions.business_id
      AND e.is_active IS DISTINCT FROM false
  )
  AND EXISTS (
    SELECT 1 FROM public.routes r
    LEFT JOIN public.route_employees re ON re.route_id = r.id AND re.employee_id = route_live_positions.employee_id
    WHERE r.id = route_id
      AND r.business_id = route_live_positions.business_id
      AND r.deleted_at IS NULL
      AND (
        r.employee_id = route_live_positions.employee_id
        OR re.employee_id IS NOT NULL
        OR EXISTS (
          SELECT 1 FROM public.route_stops rs
          JOIN public.route_stop_assignees rsa ON rsa.stop_id = rs.id
          WHERE rs.route_id = r.id AND rsa.employee_id = route_live_positions.employee_id
        )
      )
  )
  AND (current_stop_id IS NULL OR EXISTS (
    SELECT 1 FROM public.route_stops rs WHERE rs.id = current_stop_id AND rs.route_id = route_id
  ))
);

CREATE POLICY "Employees delete own route position"
ON public.route_live_positions
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.employees e
  WHERE e.id = employee_id AND e.user_id = auth.uid()
));

ALTER FUNCTION public.report_route_position(uuid,double precision,double precision,double precision,double precision,double precision,uuid) SECURITY INVOKER;
ALTER FUNCTION public.clear_route_position(uuid) SECURITY INVOKER;
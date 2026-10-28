CREATE OR REPLACE FUNCTION public.can_access_stop(_stop_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM route_stops rs JOIN routes r ON r.id = rs.route_id
    WHERE rs.id = _stop_id AND (public.is_route_assigned_employee(rs.route_id, auth.uid())
      OR public.is_business_owner(r.business_id, auth.uid()) OR public.has_role(auth.uid(),'admin')));
$$;

CREATE TABLE public.stop_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stop_id uuid NOT NULL REFERENCES public.route_stops(id) ON DELETE CASCADE,
  business_id uuid NOT NULL,
  order_id uuid,
  uploaded_by uuid NOT NULL DEFAULT auth.uid(),
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stop_photos_stop_idx ON public.stop_photos(stop_id);
GRANT SELECT, INSERT, DELETE ON public.stop_photos TO authenticated;
GRANT ALL ON public.stop_photos TO service_role;
ALTER TABLE public.stop_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View stop photos" ON public.stop_photos FOR SELECT TO authenticated USING (public.can_access_stop(stop_id));
CREATE POLICY "Add stop photos" ON public.stop_photos FOR INSERT TO authenticated WITH CHECK (public.can_access_stop(stop_id) AND uploaded_by = auth.uid()
  AND business_id = (SELECT r.business_id FROM route_stops rs JOIN routes r ON r.id = rs.route_id WHERE rs.id = stop_id));
CREATE POLICY "Delete own stop photos" ON public.stop_photos FOR DELETE TO authenticated USING (uploaded_by = auth.uid() OR public.is_business_owner(business_id, auth.uid()));

CREATE POLICY "Stop photos read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'stop-photos' AND public.can_access_stop(((storage.foldername(name))[2])::uuid));
CREATE POLICY "Stop photos upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'stop-photos' AND public.can_access_stop(((storage.foldername(name))[2])::uuid));
CREATE POLICY "Stop photos delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'stop-photos' AND owner = auth.uid());

CREATE OR REPLACE FUNCTION public.report_stop_obstacle(_stop_id uuid, _reason text, _detail text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; v_id uuid; v_body text;
BEGIN
  IF length(btrim(coalesce(_reason,''))) < 2 OR length(_reason) > 120 THEN RAISE EXCEPTION 'Vælg en årsag'; END IF;
  IF length(coalesce(_detail,'')) > 1000 THEN RAISE EXCEPTION 'Bemærkningen er for lang'; END IF;
  SELECT * INTO c FROM public._employee_stop_context(_stop_id);
  v_body := 'Kunne ikke udføres: ' || btrim(_reason) || CASE WHEN btrim(coalesce(_detail,'')) <> '' THEN E'\n' || btrim(_detail) ELSE '' END;
  INSERT INTO employee_appointment_notes(business_id, stop_id, order_id, agreement_id, route_id, employee_id, author_user_id, kind, body)
  VALUES (c.business_id, c.stop_id, c.order_id, c.agreement_id, c.route_id, c.employee_id, auth.uid(), 'obstacle', v_body)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION public.report_stop_obstacle(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_stop(uuid) TO authenticated;
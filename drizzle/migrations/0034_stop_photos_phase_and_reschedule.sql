ALTER TABLE public.stop_photos ADD COLUMN IF NOT EXISTS phase text NOT NULL DEFAULT 'after';
ALTER TABLE public.stop_photos ADD CONSTRAINT stop_photos_phase_check CHECK (phase IN ('before','after'));
-- Billeder skal overleve, når et stop flyttes af ruten (fx ved "Kunne ikke udføres").
ALTER TABLE public.stop_photos DROP CONSTRAINT IF EXISTS stop_photos_stop_id_fkey;
CREATE INDEX IF NOT EXISTS stop_photos_order_idx ON public.stop_photos(order_id);

DROP POLICY IF EXISTS "View stop photos" ON public.stop_photos;
CREATE POLICY "View stop photos" ON public.stop_photos FOR SELECT TO authenticated
  USING (public.is_business_owner(business_id, auth.uid()) OR public.has_role(auth.uid(),'admin') OR public.can_access_stop(stop_id));

DROP POLICY IF EXISTS "Stop photos read" ON storage.objects;
CREATE POLICY "Stop photos read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'stop-photos' AND (
    public.is_business_owner(((storage.foldername(name))[1])::uuid, auth.uid())
    OR public.can_access_stop(((storage.foldername(name))[2])::uuid)));
DROP POLICY IF EXISTS "Stop photos delete" ON storage.objects;
CREATE POLICY "Stop photos delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'stop-photos' AND (owner = auth.uid() OR public.is_business_owner(((storage.foldername(name))[1])::uuid, auth.uid())));

CREATE OR REPLACE FUNCTION public.report_stop_obstacle(_stop_id uuid, _reason text, _detail text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; v_id uuid; v_body text;
BEGIN
  IF length(btrim(coalesce(_reason,''))) < 2 OR length(_reason) > 120 THEN RAISE EXCEPTION 'Vælg en årsag'; END IF;
  IF length(coalesce(_detail,'')) > 1000 THEN RAISE EXCEPTION 'Bemærkningen er for lang'; END IF;
  SELECT * INTO c FROM public._employee_stop_context(_stop_id);
  IF c.stop_status = 'completed' THEN RAISE EXCEPTION 'Stoppet er allerede udført. Fortryd først.'; END IF;
  v_body := 'Kunne ikke udføres: ' || btrim(_reason) || CASE WHEN btrim(coalesce(_detail,'')) <> '' THEN E'\n' || btrim(_detail) ELSE '' END;
  INSERT INTO employee_appointment_notes(business_id, stop_id, order_id, agreement_id, route_id, employee_id, author_user_id, kind, body)
  VALUES (c.business_id, c.stop_id, c.order_id, c.agreement_id, c.route_id, c.employee_id, auth.uid(), 'obstacle', v_body)
  RETURNING id INTO v_id;
  -- Kun dette besøg tages af ruten og lander i "Aftaler uden rute".
  -- Den faste rute på serien bevares bevidst.
  IF c.order_id IS NOT NULL THEN
    DELETE FROM stop_time_entries WHERE stop_id = _stop_id AND ended_at IS NULL;
    DELETE FROM route_stop_assignees WHERE stop_id = _stop_id;
    DELETE FROM route_stops WHERE id = _stop_id;
  END IF;
  RETURN v_id;
END $$;
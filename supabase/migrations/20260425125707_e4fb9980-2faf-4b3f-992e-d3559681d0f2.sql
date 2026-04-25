CREATE TABLE public.traffic_buffer_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  zip_prefix TEXT NOT NULL,
  multiplier NUMERIC NOT NULL DEFAULT 1.20 CHECK (multiplier >= 0.5 AND multiplier <= 3.0),
  label TEXT,
  hour_start SMALLINT CHECK (hour_start IS NULL OR (hour_start >= 0 AND hour_start <= 23)),
  hour_end SMALLINT CHECK (hour_end IS NULL OR (hour_end >= 0 AND hour_end <= 24)),
  weekdays_only BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (business_id, zip_prefix, hour_start, hour_end, weekdays_only)
);

CREATE INDEX traffic_buffer_overrides_business_idx
  ON public.traffic_buffer_overrides (business_id, is_active);

ALTER TABLE public.traffic_buffer_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners manage their traffic overrides"
  ON public.traffic_buffer_overrides
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = traffic_buffer_overrides.business_id AND b.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = traffic_buffer_overrides.business_id AND b.owner_id = auth.uid()
  ));

CREATE POLICY "Employees view their business overrides"
  ON public.traffic_buffer_overrides
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.business_id = traffic_buffer_overrides.business_id
      AND e.user_id = auth.uid()
  ));

CREATE POLICY "Admins manage all traffic overrides"
  ON public.traffic_buffer_overrides
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER traffic_buffer_overrides_updated_at
  BEFORE UPDATE ON public.traffic_buffer_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
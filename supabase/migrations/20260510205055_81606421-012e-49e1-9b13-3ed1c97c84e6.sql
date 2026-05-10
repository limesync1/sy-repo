CREATE TABLE IF NOT EXISTS public.route_occurrence_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  base_route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  occurrence_date date NOT NULL,
  replacement_route_id uuid REFERENCES public.routes(id) ON DELETE SET NULL,
  exception_type text NOT NULL DEFAULT 'moved' CHECK (exception_type IN ('moved', 'skipped')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (base_route_id, occurrence_date)
);

CREATE INDEX IF NOT EXISTS idx_route_occurrence_exceptions_business
  ON public.route_occurrence_exceptions (business_id);

CREATE INDEX IF NOT EXISTS idx_route_occurrence_exceptions_base_date
  ON public.route_occurrence_exceptions (base_route_id, occurrence_date);

ALTER TABLE public.route_occurrence_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage all route occurrence exceptions" ON public.route_occurrence_exceptions;
CREATE POLICY "Admins manage all route occurrence exceptions"
ON public.route_occurrence_exceptions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Owners manage route occurrence exceptions" ON public.route_occurrence_exceptions;
CREATE POLICY "Owners manage route occurrence exceptions"
ON public.route_occurrence_exceptions
FOR ALL
USING (is_business_owner(business_id, auth.uid()))
WITH CHECK (is_business_owner(business_id, auth.uid()));

DROP TRIGGER IF EXISTS update_route_occurrence_exceptions_updated_at ON public.route_occurrence_exceptions;
CREATE TRIGGER update_route_occurrence_exceptions_updated_at
BEFORE UPDATE ON public.route_occurrence_exceptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.routes
    WHERE base_route_id IS NOT NULL
    GROUP BY base_route_id, route_date
    HAVING count(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_routes_base_route_date
      ON public.routes (base_route_id, route_date)
      WHERE base_route_id IS NOT NULL;
  END IF;
END $$;
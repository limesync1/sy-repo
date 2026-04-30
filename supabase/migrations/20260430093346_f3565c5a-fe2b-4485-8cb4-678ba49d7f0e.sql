
CREATE TABLE IF NOT EXISTS public.accounting_sync_dlq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  provider text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  operation text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  payload jsonb,
  original_queue_id uuid,
  original_created_at timestamptz,
  moved_to_dlq_at timestamptz NOT NULL DEFAULT now(),
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dlq_business ON public.accounting_sync_dlq (business_id, resolved, moved_to_dlq_at DESC);
CREATE INDEX IF NOT EXISTS idx_dlq_entity ON public.accounting_sync_dlq (business_id, entity_type, entity_id) WHERE resolved = false;

ALTER TABLE public.accounting_sync_dlq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their DLQ"
ON public.accounting_sync_dlq FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can manage DLQ"
ON public.accounting_sync_dlq FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Funktion: send job tilbage i køen
CREATE OR REPLACE FUNCTION public.retry_dlq_job(_dlq_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dlq RECORD;
  v_new_id uuid;
  v_is_owner boolean;
BEGIN
  SELECT * INTO v_dlq FROM public.accounting_sync_dlq WHERE id = _dlq_id AND resolved = false;
  IF NOT FOUND THEN RAISE EXCEPTION 'DLQ job not found or already resolved'; END IF;

  SELECT EXISTS (SELECT 1 FROM public.businesses WHERE id = v_dlq.business_id AND owner_id = auth.uid())
    INTO v_is_owner;
  IF NOT v_is_owner AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Genskab job i køen (overskriv evt. existing via ON CONFLICT)
  INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation, attempts, status, scheduled_for)
  VALUES (v_dlq.business_id, v_dlq.entity_type, v_dlq.entity_id, v_dlq.operation, 0, 'pending', now())
  ON CONFLICT (business_id, entity_type, entity_id) WHERE status IN ('pending', 'processing')
  DO UPDATE SET attempts = 0, status = 'pending', scheduled_for = now(), last_error = NULL
  RETURNING id INTO v_new_id;

  UPDATE public.accounting_sync_dlq
     SET resolved = true, resolved_at = now(), resolved_by = auth.uid(),
         resolution_note = 'Retry initieret'
   WHERE id = _dlq_id;

  PERFORM public.kick_accounting_sync(v_dlq.business_id);
  RETURN v_new_id;
END;
$$;

-- Funktion: marker som håndteret manuelt
CREATE OR REPLACE FUNCTION public.dismiss_dlq_job(_dlq_id uuid, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_is_owner boolean;
BEGIN
  SELECT business_id INTO v_business_id FROM public.accounting_sync_dlq WHERE id = _dlq_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'DLQ job not found'; END IF;

  SELECT EXISTS (SELECT 1 FROM public.businesses WHERE id = v_business_id AND owner_id = auth.uid())
    INTO v_is_owner;
  IF NOT v_is_owner AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.accounting_sync_dlq
     SET resolved = true, resolved_at = now(), resolved_by = auth.uid(),
         resolution_note = COALESCE(_note, 'Håndteret manuelt')
   WHERE id = _dlq_id;
END;
$$;

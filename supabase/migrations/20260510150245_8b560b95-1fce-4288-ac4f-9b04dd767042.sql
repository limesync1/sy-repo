
-- Idempotency-tabel for ruteplanlæggerens drag-and-drop.
-- Hver "drop"-handling claimer en stabil nøgle FØR den udfører arbejdet.
-- ON CONFLICT DO NOTHING garanterer at to parallelle/dobbelt-klik aldrig
-- kan oprette dublerede ruter eller stops — den anden kørsel bailer ud
-- når dens claim returnerer false.

CREATE TABLE IF NOT EXISTS public.route_planner_idempotency (
  key text PRIMARY KEY,
  business_id uuid NOT NULL,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_route_planner_idempotency_created
  ON public.route_planner_idempotency (created_at);

ALTER TABLE public.route_planner_idempotency ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage planner idempotency keys" ON public.route_planner_idempotency;
CREATE POLICY "Owners manage planner idempotency keys"
ON public.route_planner_idempotency
FOR ALL
USING (public.is_business_owner(business_id, auth.uid()))
WITH CHECK (public.is_business_owner(business_id, auth.uid()));

DROP POLICY IF EXISTS "Admins manage planner idempotency keys" ON public.route_planner_idempotency;
CREATE POLICY "Admins manage planner idempotency keys"
ON public.route_planner_idempotency
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Atomart claim. Returnerer true hvis kalderen er den FØRSTE der claimer
-- denne nøgle, false hvis nøglen allerede findes (dvs. en anden kørsel
-- har eller er ved at behandle det samme drop).
CREATE OR REPLACE FUNCTION public.claim_route_planner_idempotency(
  _key text,
  _business_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted boolean;
BEGIN
  IF _key IS NULL OR length(trim(_key)) = 0 THEN
    RAISE EXCEPTION 'invalid_idempotency_key';
  END IF;

  IF NOT (
    public.is_business_owner(_business_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  INSERT INTO public.route_planner_idempotency (key, business_id, user_id)
  VALUES (_key, _business_id, auth.uid())
  ON CONFLICT (key) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted::int = 1;
END;
$$;

-- Periodisk oprydning: nøgler over 1 time gamle slettes for at holde tabellen lille.
CREATE OR REPLACE FUNCTION public.cleanup_route_planner_idempotency()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM public.route_planner_idempotency
  WHERE created_at < now() - interval '1 hour';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

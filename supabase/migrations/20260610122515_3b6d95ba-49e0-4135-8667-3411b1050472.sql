
CREATE TABLE IF NOT EXISTS public.business_agreement_counters (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  year int NOT NULL,
  last_seq int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_agreement_counters TO authenticated;
GRANT ALL ON public.business_agreement_counters TO service_role;
ALTER TABLE public.business_agreement_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read own counter" ON public.business_agreement_counters;
CREATE POLICY "Read own counter" ON public.business_agreement_counters
  FOR SELECT TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

ALTER TABLE public.agreements
  ADD COLUMN IF NOT EXISTS agreement_number text;
CREATE UNIQUE INDEX IF NOT EXISTS agreements_business_agreement_number_uniq
  ON public.agreements(business_id, agreement_number)
  WHERE agreement_number IS NOT NULL;

ALTER TABLE public.agreement_occurrences
  ADD COLUMN IF NOT EXISTS occurrence_number text;
CREATE UNIQUE INDEX IF NOT EXISTS agreement_occ_business_occnum_uniq
  ON public.agreement_occurrences(business_id, occurrence_number)
  WHERE occurrence_number IS NOT NULL;

CREATE OR REPLACE FUNCTION public._allocate_agreement_number(_business_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_year int := EXTRACT(YEAR FROM now())::int;
  v_seq int;
BEGIN
  INSERT INTO public.business_agreement_counters (business_id, year, last_seq)
  VALUES (_business_id, v_year, 1)
  ON CONFLICT (business_id) DO UPDATE
    SET last_seq = CASE
        WHEN public.business_agreement_counters.year = v_year
          THEN public.business_agreement_counters.last_seq + 1
        ELSE 1
      END,
      year = v_year,
      updated_at = now()
  RETURNING last_seq INTO v_seq;
  RETURN 'AFT-' || v_year::text || '-' || lpad(v_seq::text, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public._assign_agreement_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.agreement_number IS NULL
     AND NEW.status IN ('active', 'pending_approval', 'paused') THEN
    NEW.agreement_number := public._allocate_agreement_number(NEW.business_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_agreement_number_ins ON public.agreements;
CREATE TRIGGER trg_assign_agreement_number_ins
  BEFORE INSERT ON public.agreements
  FOR EACH ROW EXECUTE FUNCTION public._assign_agreement_number();

DROP TRIGGER IF EXISTS trg_assign_agreement_number_upd ON public.agreements;
CREATE TRIGGER trg_assign_agreement_number_upd
  BEFORE UPDATE OF status ON public.agreements
  FOR EACH ROW
  WHEN (NEW.agreement_number IS NULL)
  EXECUTE FUNCTION public._assign_agreement_number();

CREATE OR REPLACE FUNCTION public._assign_occurrence_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_agreement_number text;
BEGIN
  IF NEW.occurrence_number IS NOT NULL THEN RETURN NEW; END IF;

  SELECT agreement_number INTO v_agreement_number
    FROM public.agreements WHERE id = NEW.agreement_id;

  IF v_agreement_number IS NULL THEN
    UPDATE public.agreements
       SET agreement_number = public._allocate_agreement_number(business_id)
     WHERE id = NEW.agreement_id AND agreement_number IS NULL
     RETURNING agreement_number INTO v_agreement_number;
  END IF;

  IF v_agreement_number IS NOT NULL THEN
    NEW.occurrence_number := v_agreement_number || '-' || lpad((COALESCE(NEW.sequence_index, 0) + 1)::text, 2, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_occurrence_number ON public.agreement_occurrences;
CREATE TRIGGER trg_assign_occurrence_number
  BEFORE INSERT ON public.agreement_occurrences
  FOR EACH ROW EXECUTE FUNCTION public._assign_occurrence_number();

-- Backfill agreements (valid statuses only)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT id, business_id
      FROM public.agreements
     WHERE agreement_number IS NULL
       AND status IN ('active', 'pending_approval', 'paused', 'ended', 'cancelled')
     ORDER BY business_id, created_at
  LOOP
    UPDATE public.agreements
       SET agreement_number = public._allocate_agreement_number(r.business_id)
     WHERE id = r.id;
  END LOOP;
END $$;

UPDATE public.agreement_occurrences ao
   SET occurrence_number = a.agreement_number || '-' || lpad((COALESCE(ao.sequence_index, 0) + 1)::text, 2, '0')
  FROM public.agreements a
 WHERE ao.agreement_id = a.id
   AND ao.occurrence_number IS NULL
   AND a.agreement_number IS NOT NULL;

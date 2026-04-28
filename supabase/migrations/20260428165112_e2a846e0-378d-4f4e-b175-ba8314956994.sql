-- Slug history: bevarer gamle URL-stumper når en virksomhed ændrer permalink,
-- så gamle links og søgeresultater kan redirecte til den nye adresse.
CREATE TABLE IF NOT EXISTS public.business_slug_history (
  slug TEXT PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_slug_history_biz ON public.business_slug_history(business_id);

ALTER TABLE public.business_slug_history ENABLE ROW LEVEL SECURITY;

-- Læses offentligt så gæster der besøger en gammel URL kan blive viderestillet.
CREATE POLICY "Slug history viewable by everyone"
  ON public.business_slug_history FOR SELECT
  USING (true);

-- Kun ejer eller admin kan tilføje historik (sker når ejeren skifter permalink).
CREATE POLICY "Owners insert slug history for their business"
  ON public.business_slug_history FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses b
            WHERE b.id = business_slug_history.business_id AND b.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins manage slug history"
  ON public.business_slug_history FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger: hver gang businesses.slug ændres, gem den gamle slug i historikken.
-- ON CONFLICT DO NOTHING beskytter mod sjældent tilfælde hvor en allerede
-- arkiveret slug kommer tilbage (sletning er ikke understøttet for at undgå
-- broken links).
CREATE OR REPLACE FUNCTION public.archive_old_business_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.slug IS DISTINCT FROM OLD.slug AND OLD.slug IS NOT NULL THEN
    INSERT INTO public.business_slug_history (slug, business_id)
    VALUES (OLD.slug, OLD.id)
    ON CONFLICT (slug) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_archive_old_business_slug ON public.businesses;
CREATE TRIGGER trg_archive_old_business_slug
  BEFORE UPDATE OF slug ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.archive_old_business_slug();
CREATE OR REPLACE FUNCTION public._guard_listing_only_operations()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.business_id IS NULL OR NOT public.business_is_listing_only(NEW.business_id) THEN
    RETURN NEW;
  END IF;
  -- Regnskabsjob springes stille over, så andre handlinger (fx en forespørgsel) aldrig fejler.
  IF TG_TABLE_NAME = 'accounting_sync_queue' THEN
    RETURN NULL;
  END IF;
  IF TG_TABLE_NAME = 'employees' AND NEW.user_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = NEW.business_id AND b.owner_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Denne funktion kræver det fulde system. Opgradér under Indstillinger for at bruge ruter, medarbejdere, aftaler og regnskab.'
    USING ERRCODE = 'P0001';
END $$;
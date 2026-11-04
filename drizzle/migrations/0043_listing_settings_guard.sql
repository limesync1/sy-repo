CREATE OR REPLACE FUNCTION public._guard_listing_settings()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.business_is_listing_only(NEW.id) THEN
    NEW.settings := COALESCE(NEW.settings,'{}'::jsonb)
      || jsonb_build_object('route_planning_enabled', false, 'accounting_integration_enabled', false, 'plan_kind', 'listing');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_listing_settings ON public.businesses;
CREATE TRIGGER trg_guard_listing_settings BEFORE UPDATE OF settings ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public._guard_listing_settings();
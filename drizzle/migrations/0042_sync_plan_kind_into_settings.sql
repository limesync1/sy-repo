CREATE OR REPLACE FUNCTION public._sync_plan_kind_to_settings()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.businesses
     SET settings = COALESCE(settings,'{}'::jsonb)
                    || jsonb_build_object('route_planning_enabled', NEW.plan_kind = 'full', 'plan_kind', NEW.plan_kind)
                    || CASE WHEN NEW.plan_kind = 'listing'
                            THEN jsonb_build_object('accounting_integration_enabled', false) ELSE '{}'::jsonb END
   WHERE id = NEW.business_id;
  RETURN NEW;
END $$;
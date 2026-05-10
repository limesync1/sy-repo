ALTER TABLE public.agreements
  ADD COLUMN IF NOT EXISTS preferred_route_id uuid;

CREATE INDEX IF NOT EXISTS idx_agreements_preferred_route
  ON public.agreements(preferred_route_id) WHERE preferred_route_id IS NOT NULL;

UPDATE public.agreements a
   SET preferred_route_id = s.preferred_route_id
  FROM public.subscriptions s
 WHERE a.legacy_subscription_id = s.id
   AND a.preferred_route_id IS NULL
   AND s.preferred_route_id IS NOT NULL;

-- Extend cleanup trigger to nullify preferred_route_id on agreements too
CREATE OR REPLACE FUNCTION public.cleanup_route_references()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  UPDATE public.subscriptions
     SET preferred_route_id = NULL
   WHERE preferred_route_id = OLD.id;

  UPDATE public.agreements
     SET preferred_route_id = NULL
   WHERE preferred_route_id = OLD.id;

  IF OLD.route_template_id IS NOT NULL THEN
    UPDATE public.agreements
       SET default_route_template_id = NULL
     WHERE default_route_template_id = OLD.route_template_id
       AND NOT EXISTS (
         SELECT 1 FROM public.routes r2
          WHERE r2.route_template_id = OLD.route_template_id
            AND r2.id <> OLD.id
       );
  END IF;

  RETURN OLD;
END;
$function$;
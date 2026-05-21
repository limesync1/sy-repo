
-- Trin 25: log Stripe-nøgleændringer i admin_audit_log (uden at lække værdier)
CREATE OR REPLACE FUNCTION public._log_platform_settings_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changed text[] := ARRAY[]::text[];
BEGIN
  IF COALESCE(OLD.stripe_publishable_key,'') IS DISTINCT FROM COALESCE(NEW.stripe_publishable_key,'') THEN
    v_changed := array_append(v_changed, 'publishable_key');
  END IF;
  IF COALESCE(OLD.stripe_secret_key,'') IS DISTINCT FROM COALESCE(NEW.stripe_secret_key,'') THEN
    v_changed := array_append(v_changed, 'secret_key');
  END IF;
  IF COALESCE(OLD.stripe_webhook_secret,'') IS DISTINCT FROM COALESCE(NEW.stripe_webhook_secret,'') THEN
    v_changed := array_append(v_changed, 'webhook_secret');
  END IF;

  IF array_length(v_changed, 1) > 0 THEN
    PERFORM public._admin_log(
      'update_stripe_keys',
      'platform_settings',
      'Stripe-nøgler',
      jsonb_build_object(
        'changed_fields', to_jsonb(v_changed),
        'secret_mode', CASE
          WHEN NEW.stripe_secret_key LIKE 'sk_live_%' THEN 'live'
          WHEN NEW.stripe_secret_key LIKE 'sk_test_%' THEN 'test'
          WHEN NEW.stripe_secret_key IS NULL OR NEW.stripe_secret_key = '' THEN 'cleared'
          ELSE 'unknown'
        END
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_platform_settings_changes ON public.platform_settings;
CREATE TRIGGER trg_log_platform_settings_changes
AFTER UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public._log_platform_settings_changes();

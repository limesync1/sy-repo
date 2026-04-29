CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.kick_accounting_sync(_business_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'net'
AS $$
DECLARE
  v_url text := 'https://gkectsellkpltrxvusot.supabase.co/functions/v1/accounting-sync';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZWN0c2VsbGtwbHRyeHZ1c290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMTkxMDYsImV4cCI6MjA5MTU5NTEwNn0.VxLbs00qkZXCiNa468aHEC9FJhoY3Gyik0D8dKBdq_c';
BEGIN
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_anon,
      'Authorization', 'Bearer ' || v_anon
    ),
    body := jsonb_build_object(
      'business_id', _business_id,
      'mode', 'queue',
      'internal_mode', true
    )
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_accounting_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_business_id uuid;
  v_entity_type text;
  v_entity_id uuid;
  v_op text;
  v_has_integration boolean;
BEGIN
  IF TG_TABLE_NAME = 'orders' THEN
    v_entity_type := 'order';
    v_business_id := COALESCE(NEW.business_id, OLD.business_id);
    v_entity_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'services' THEN
    v_entity_type := 'product';
    v_business_id := COALESCE(NEW.business_id, OLD.business_id);
    v_entity_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'business_customers' OR TG_TABLE_NAME = 'private_customers' THEN
    v_entity_type := 'customer';
    v_business_id := COALESCE(NEW.business_id, OLD.business_id);
    v_entity_id := COALESCE(NEW.id, OLD.id);
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_business_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.accounting_integrations
    WHERE business_id = v_business_id AND is_active = true
  ) INTO v_has_integration;

  IF NOT v_has_integration THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_op := CASE TG_OP
            WHEN 'INSERT' THEN 'create'
            WHEN 'UPDATE' THEN 'update'
            WHEN 'DELETE' THEN 'delete'
          END;

  INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation)
  SELECT v_business_id, v_entity_type, v_entity_id, v_op
  WHERE NOT EXISTS (
    SELECT 1 FROM public.accounting_sync_queue
    WHERE business_id = v_business_id
      AND entity_type = v_entity_type
      AND entity_id = v_entity_id
      AND status IN ('pending', 'processing')
  );

  PERFORM public.kick_accounting_sync(v_business_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;
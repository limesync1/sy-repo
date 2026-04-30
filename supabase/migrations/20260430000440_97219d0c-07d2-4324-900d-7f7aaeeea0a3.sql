
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
  v_paused timestamptz;
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

  SELECT is_active, paused_until INTO v_has_integration, v_paused
  FROM public.accounting_integrations
  WHERE business_id = v_business_id
  LIMIT 1;

  IF NOT COALESCE(v_has_integration, false) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Skip hvis integration er midlertidigt pauset
  IF v_paused IS NOT NULL AND v_paused > now() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_op := CASE TG_OP
            WHEN 'INSERT' THEN 'create'
            WHEN 'UPDATE' THEN 'update'
            WHEN 'DELETE' THEN 'delete'
          END;

  -- Brug ON CONFLICT så samme entitet ikke kan have flere aktive jobs
  BEGIN
    INSERT INTO public.accounting_sync_queue (business_id, entity_type, entity_id, operation)
    VALUES (v_business_id, v_entity_type, v_entity_id, v_op);
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  PERFORM public.kick_accounting_sync(v_business_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

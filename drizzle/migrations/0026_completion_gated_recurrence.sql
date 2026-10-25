DO $migration$
DECLARE definition text;
BEGIN
  definition := pg_get_functiondef('public.auto_recur_due_orders()'::regprocedure);
  definition := replace(definition,
    'IF (r.interval IN (''every_1_hour_test'', ''every_30_minutes_test'', ''every_5_minutes_test'') AND v_source_order.status <> ''completed'') OR v_source_order.status NOT IN (''completed'',''confirmed'') THEN',
    'IF v_source_order.status <> ''completed'' THEN');
  IF position('IF v_source_order.status <> ''completed'' THEN' in definition) = 0 THEN
    RAISE EXCEPTION 'Completion gate patch did not match';
  END IF;
  definition := replace(definition,
    'v_cycle := COALESCE(v_source_order.recurrence_cycle, 0) + 1;',
    $patch$v_cycle := COALESCE(v_source_order.recurrence_cycle, 0) + 1;
    -- Serialize all subscriptions belonging to this order series, including concurrent workers.
    PERFORM pg_advisory_xact_lock(hashtextextended(v_root::text, 0));
    IF EXISTS (
      SELECT 1 FROM public.orders outstanding
      WHERE COALESCE(outstanding.parent_order_id, outstanding.id) = v_root
        AND outstanding.business_id = v_source_order.business_id
        AND outstanding.status NOT IN ('completed', 'cancelled')
    ) THEN
      CONTINUE;
    END IF;$patch$);
  IF position('pg_advisory_xact_lock' in definition) = 0 THEN
    RAISE EXCEPTION 'Single outstanding order patch did not match';
  END IF;
  EXECUTE definition;

  definition := pg_get_functiondef('public.auto_create_subscriptions_from_order()'::regprocedure);
  definition := replace(definition,
    'IF NEW.status = ''cancelled'' THEN RETURN NEW; END IF;',
    'IF NEW.status = ''cancelled'' OR (NEW.parent_order_id IS NOT NULL AND NEW.parent_order_id <> NEW.id) THEN RETURN NEW; END IF;');
  IF position('NEW.parent_order_id <> NEW.id' in definition) = 0 THEN
    RAISE EXCEPTION 'Recurring child subscription guard did not match';
  END IF;
  EXECUTE definition;
END;
$migration$;
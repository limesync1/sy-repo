
-- =============================================================================
-- Bølge 3.1: route_events domain event log
-- =============================================================================

-- 1. Table
CREATE TABLE public.route_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  entity_type   text NOT NULL,                  -- 'route_stop' | 'route' | 'occurrence_exception' | 'accounting_queue' | ...
  entity_id     uuid,                            -- the affected row id (nullable for aggregate events)
  route_id      uuid,                            -- denormalized for fast per-route timeline queries
  event_type    text NOT NULL,                  -- 'STOP_COMPLETED' | 'OCCURRENCE_UPDATED' | 'NEXT_OCCURRENCE_CREATED' | 'INVOICE_ENQUEUED' | 'ACCOUNTING_SYNCED' | ...
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by    uuid,                            -- auth.uid() if available (NULL for system/trigger)
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 2. GRANTs (read for app users via RLS; writes only via SECURITY DEFINER helper)
GRANT SELECT ON public.route_events TO authenticated;
GRANT ALL ON public.route_events TO service_role;

-- 3. Indexes
CREATE INDEX idx_route_events_business_created ON public.route_events (business_id, created_at DESC);
CREATE INDEX idx_route_events_route_created    ON public.route_events (route_id, created_at DESC) WHERE route_id IS NOT NULL;
CREATE INDEX idx_route_events_entity           ON public.route_events (entity_type, entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX idx_route_events_type_created     ON public.route_events (event_type, created_at DESC);

-- 4. RLS
ALTER TABLE public.route_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all route events"
  ON public.route_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Owners read their route events"
  ON public.route_events FOR SELECT
  USING (public.is_business_owner(business_id, auth.uid()));

-- No INSERT/UPDATE/DELETE policies → only SECURITY DEFINER functions can write.

-- 5. Helper: log_route_event ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_route_event(
  _business_id  uuid,
  _entity_type  text,
  _entity_id    uuid,
  _event_type   text,
  _payload      jsonb DEFAULT '{}'::jsonb,
  _route_id     uuid DEFAULT NULL,
  _actor_id     uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _actor uuid;
BEGIN
  IF _business_id IS NULL THEN
    -- never raise from a trigger — silently skip if we can't attribute the event
    RETURN NULL;
  END IF;

  BEGIN
    _actor := COALESCE(_actor_id, auth.uid());
  EXCEPTION WHEN OTHERS THEN
    _actor := _actor_id;
  END;

  INSERT INTO public.route_events
    (business_id, entity_type, entity_id, route_id, event_type, payload, created_by)
  VALUES
    (_business_id, _entity_type, _entity_id, _route_id, _event_type,
     COALESCE(_payload, '{}'::jsonb), _actor)
  RETURNING id INTO _id;

  RETURN _id;
EXCEPTION WHEN OTHERS THEN
  -- Observability must never break the originating mutation.
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.log_route_event(uuid, text, uuid, text, jsonb, uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.log_route_event(uuid, text, uuid, text, jsonb, uuid, uuid) TO service_role;

-- 6. Trigger: STOP_COMPLETED --------------------------------------------------
CREATE OR REPLACE FUNCTION public.emit_route_event_stop_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _biz uuid;
BEGIN
  IF NEW.status = 'completed' AND COALESCE(OLD.status, '') <> 'completed' THEN
    SELECT business_id INTO _biz FROM public.routes WHERE id = NEW.route_id;
    PERFORM public.log_route_event(
      _biz,
      'route_stop',
      NEW.id,
      'STOP_COMPLETED',
      jsonb_build_object(
        'route_id', NEW.route_id,
        'order_id', NEW.order_id,
        'sequence', NEW.sequence,
        'completed_at', NEW.completed_at
      ),
      NEW.route_id,
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emit_route_event_stop_completed ON public.route_stops;
CREATE TRIGGER trg_emit_route_event_stop_completed
  AFTER UPDATE OF status ON public.route_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.emit_route_event_stop_completed();

-- 7. Trigger: OCCURRENCE_UPDATED ----------------------------------------------
CREATE OR REPLACE FUNCTION public.emit_route_event_occurrence_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row record;
  _evt text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _row := OLD;
    _evt := 'OCCURRENCE_REMOVED';
  ELSIF TG_OP = 'INSERT' THEN
    _row := NEW;
    _evt := 'OCCURRENCE_UPDATED';
  ELSE
    _row := NEW;
    _evt := 'OCCURRENCE_UPDATED';
  END IF;

  PERFORM public.log_route_event(
    _row.business_id,
    'occurrence_exception',
    _row.id,
    _evt,
    jsonb_build_object(
      'base_route_id', _row.base_route_id,
      'occurrence_date', _row.occurrence_date,
      'exception_type', _row.exception_type,
      'replacement_route_id', _row.replacement_route_id,
      'shifted_to_date', _row.shifted_to_date,
      'op', TG_OP
    ),
    _row.base_route_id,
    NULL
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_emit_route_event_occurrence_changed ON public.route_occurrence_exceptions;
CREATE TRIGGER trg_emit_route_event_occurrence_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.route_occurrence_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION public.emit_route_event_occurrence_changed();

-- 8. Triggers: INVOICE_ENQUEUED + ACCOUNTING_SYNCED ---------------------------
CREATE OR REPLACE FUNCTION public.emit_route_event_accounting_queue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.entity_type IN ('invoice', 'order', 'agreement_occurrence') THEN
      PERFORM public.log_route_event(
        NEW.business_id,
        'accounting_queue',
        NEW.id,
        'INVOICE_ENQUEUED',
        jsonb_build_object(
          'entity_type', NEW.entity_type,
          'entity_id', NEW.entity_id,
          'operation', NEW.operation
        ),
        NULL,
        NULL
      );
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'done' AND COALESCE(OLD.status, '') <> 'done' THEN
      PERFORM public.log_route_event(
        NEW.business_id,
        'accounting_queue',
        NEW.id,
        'ACCOUNTING_SYNCED',
        jsonb_build_object(
          'entity_type', NEW.entity_type,
          'entity_id', NEW.entity_id,
          'operation', NEW.operation,
          'attempts', NEW.attempts,
          'processed_at', NEW.processed_at
        ),
        NULL,
        NULL
      );
    ELSIF NEW.status = 'failed' AND COALESCE(OLD.status, '') <> 'failed' THEN
      PERFORM public.log_route_event(
        NEW.business_id,
        'accounting_queue',
        NEW.id,
        'ACCOUNTING_FAILED',
        jsonb_build_object(
          'entity_type', NEW.entity_type,
          'entity_id', NEW.entity_id,
          'attempts', NEW.attempts,
          'last_error', NEW.last_error
        ),
        NULL,
        NULL
      );
    END IF;
    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_emit_route_event_accounting_insert ON public.accounting_sync_queue;
CREATE TRIGGER trg_emit_route_event_accounting_insert
  AFTER INSERT ON public.accounting_sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.emit_route_event_accounting_queue();

DROP TRIGGER IF EXISTS trg_emit_route_event_accounting_update ON public.accounting_sync_queue;
CREATE TRIGGER trg_emit_route_event_accounting_update
  AFTER UPDATE OF status ON public.accounting_sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.emit_route_event_accounting_queue();

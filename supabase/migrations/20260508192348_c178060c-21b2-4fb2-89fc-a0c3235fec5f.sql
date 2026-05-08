
-- Tabel: historik af alle prisjusteringer/forslag fra virksomheden
CREATE TABLE public.order_proposal_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  business_id uuid NOT NULL,
  customer_id uuid,
  proposed_at timestamptz NOT NULL DEFAULT now(),
  original_amount numeric,
  original_items jsonb,
  adjusted_amount numeric,
  adjusted_items jsonb,
  business_message text,
  customer_decision text CHECK (customer_decision IN ('accepted','rejected')),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_oph_order ON public.order_proposal_history(order_id, proposed_at DESC);
CREATE INDEX idx_oph_customer ON public.order_proposal_history(customer_id);
CREATE INDEX idx_oph_business ON public.order_proposal_history(business_id);

ALTER TABLE public.order_proposal_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view own proposal history"
  ON public.order_proposal_history FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Business owners view their proposal history"
  ON public.order_proposal_history FOR SELECT
  USING (public.is_business_owner(business_id, auth.uid()));

CREATE POLICY "Admins view all proposal history"
  ON public.order_proposal_history FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Realtime så kundepanelet ser opdateringer live
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_proposal_history;
ALTER TABLE public.order_proposal_history REPLICA IDENTITY FULL;

-- Trigger: log nye forslag + kundens svar
CREATE OR REPLACE FUNCTION public.log_order_proposal_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_orig_items jsonb;
BEGIN
  IF NEW.business_response = 'adjusted'
     AND (OLD.business_response IS DISTINCT FROM 'adjusted'
          OR OLD.adjusted_details IS DISTINCT FROM NEW.adjusted_details
          OR OLD.adjusted_amount IS DISTINCT FROM NEW.adjusted_amount)
     AND NEW.adjusted_details IS NOT NULL THEN
    SELECT jsonb_agg(jsonb_build_object(
      'service_id', oi.service_id,
      'service_name', oi.service_name,
      'quantity', oi.quantity,
      'unit_price', oi.unit_price,
      'total_price', oi.total_price,
      'details', oi.details
    )) INTO v_orig_items
    FROM order_items oi WHERE oi.order_id = NEW.id;

    INSERT INTO order_proposal_history (
      order_id, business_id, customer_id, proposed_at,
      original_amount, original_items,
      adjusted_amount, adjusted_items, business_message
    ) VALUES (
      NEW.id, NEW.business_id, NEW.customer_id, now(),
      NEW.total_amount, COALESCE(v_orig_items, '[]'::jsonb),
      NEW.adjusted_amount, COALESCE((NEW.adjusted_details->'items'), '[]'::jsonb),
      NEW.business_message
    );
  END IF;

  IF NEW.customer_response IS NOT NULL
     AND OLD.customer_response IS DISTINCT FROM NEW.customer_response THEN
    UPDATE order_proposal_history
       SET customer_decision = NEW.customer_response,
           decided_at = now()
     WHERE id = (
       SELECT id FROM order_proposal_history
        WHERE order_id = NEW.id AND decided_at IS NULL
        ORDER BY proposed_at DESC LIMIT 1
     );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_order_proposal_changes ON public.orders;
CREATE TRIGGER trg_log_order_proposal_changes
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_proposal_changes();

-- Trigger: synkronisér ALTID abonnementer når kunden accepterer et forslag.
-- Dette sikrer at total_price/interval bliver opdateret korrekt uanset om
-- accepten kommer fra UI, edge function eller email-link.
CREATE OR REPLACE FUNCTION public.sync_subs_on_proposal_accept()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_items jsonb;
  v_item jsonb;
  v_handled uuid[];
  sub record;
  v_match jsonb;
  v_new_interval text;
  v_total numeric;
BEGIN
  IF NEW.customer_response = 'accepted'
     AND OLD.customer_response IS DISTINCT FROM 'accepted'
     AND NEW.business_response = 'adjusted'
     AND NEW.adjusted_details IS NOT NULL THEN

    v_items := COALESCE(NEW.adjusted_details->'items', '[]'::jsonb);
    v_handled := ARRAY[]::uuid[];

    FOR sub IN SELECT * FROM subscriptions WHERE order_id = NEW.id LOOP
      v_match := NULL;
      FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
        IF (v_item->>'service_id') IS NOT NULL
           AND (v_item->>'service_id')::uuid = sub.service_id THEN
          v_match := v_item; EXIT;
        END IF;
      END LOOP;
      IF v_match IS NULL AND jsonb_array_length(v_items) = 1 THEN
        v_match := v_items->0;
      END IF;

      IF v_match IS NOT NULL THEN
        IF (v_match->>'service_id') IS NOT NULL THEN
          v_handled := array_append(v_handled, (v_match->>'service_id')::uuid);
        END IF;
        v_new_interval := v_match->'details'->>'interval';
        v_total := COALESCE((v_match->>'total_price')::numeric, NEW.adjusted_amount, sub.total_price);

        IF v_new_interval = 'engangskøb' AND sub.interval IS DISTINCT FROM 'engangskøb' THEN
          UPDATE subscriptions
             SET total_price = v_total,
                 details = COALESCE(sub.details, '{}'::jsonb) || COALESCE(v_match->'details', '{}'::jsonb),
                 interval = v_new_interval,
                 status = 'cancelled',
                 cancelled_at = now()
           WHERE id = sub.id;
        ELSE
          UPDATE subscriptions
             SET total_price = v_total,
                 details = COALESCE(sub.details, '{}'::jsonb) || COALESCE(v_match->'details', '{}'::jsonb),
                 interval = COALESCE(v_new_interval, sub.interval),
                 status = 'active'
           WHERE id = sub.id;
        END IF;
      ELSE
        UPDATE subscriptions
           SET total_price = COALESCE(NEW.adjusted_amount, sub.total_price),
               status = 'active'
         WHERE id = sub.id;
      END IF;
    END LOOP;

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
      v_new_interval := v_item->'details'->>'interval';
      IF v_new_interval IS NOT NULL
         AND v_new_interval <> 'engangskøb'
         AND (v_item->>'service_id') IS NOT NULL
         AND NOT ((v_item->>'service_id')::uuid = ANY(v_handled)) THEN
        INSERT INTO subscriptions (
          customer_id, business_id, service_id, order_id,
          service_name, interval, total_price, details, status,
          customer_email, customer_name
        ) VALUES (
          NEW.customer_id, NEW.business_id, (v_item->>'service_id')::uuid, NEW.id,
          COALESCE(v_item->>'service_name', 'Service'),
          v_new_interval,
          COALESCE((v_item->>'total_price')::numeric, 0),
          COALESCE(v_item->'details', '{}'::jsonb),
          'active',
          NEW.customer_email, NEW.customer_name
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_subs_on_proposal_accept ON public.orders;
CREATE TRIGGER trg_sync_subs_on_proposal_accept
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_subs_on_proposal_accept();

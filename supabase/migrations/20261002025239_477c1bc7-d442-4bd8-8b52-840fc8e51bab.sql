-- 1) Calculator-priced order items: recompute price server-side from calculator steps
CREATE OR REPLACE FUNCTION public._guard_untrusted_order_item()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE o record; s record; v_total numeric := 0; v_step jsonb; cs record; v_val numeric;
BEGIN
  IF public._is_trusted_writer() THEN RETURN NEW; END IF;
  SELECT id, business_id INTO o FROM public.orders WHERE id = NEW.order_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Ordre findes ikke'; END IF;
  IF auth.uid() IS NOT NULL AND public.is_business_owner(o.business_id, auth.uid()) THEN RETURN NEW; END IF;
  IF NEW.service_id IS NULL THEN RAISE EXCEPTION 'Service mangler'; END IF;
  SELECT id, business_id, pricing_type, base_price, is_active, name INTO s FROM public.services WHERE id = NEW.service_id;
  IF s.id IS NULL OR s.business_id <> o.business_id OR NOT s.is_active THEN
    RAISE EXCEPTION 'Ugyldig service for denne virksomhed';
  END IF;
  NEW.quantity := LEAST(GREATEST(coalesce(NEW.quantity, 1), 0), 10000);
  IF s.pricing_type IN ('fast_pris','timepris') THEN
    NEW.unit_price := coalesce(s.base_price, 0);
  ELSE
    -- Ignore the client-supplied price; derive it from the service's own calculator steps.
    IF jsonb_typeof(NEW.details->'stepDetails') = 'array' THEN
      FOR v_step IN SELECT * FROM jsonb_array_elements(NEW.details->'stepDetails') LOOP
        CONTINUE WHEN (v_step->>'id') IS NULL OR (v_step->>'id') !~ '^[0-9a-fA-F-]{36}$';
        SELECT id, price_per_unit, min_value, max_value INTO cs
          FROM public.calculator_steps WHERE id = (v_step->>'id')::uuid AND service_id = s.id;
        CONTINUE WHEN cs.id IS NULL;
        BEGIN v_val := (v_step->>'value')::numeric; EXCEPTION WHEN others THEN v_val := 0; END;
        v_val := GREATEST(coalesce(v_val,0), coalesce(cs.min_value, 0));
        IF cs.max_value IS NOT NULL THEN v_val := LEAST(v_val, cs.max_value); END IF;
        v_total := v_total + v_val * coalesce(cs.price_per_unit, 0);
      END LOOP;
    END IF;
    NEW.unit_price := LEAST(GREATEST(round(v_total, 2), 0), 1000000);
  END IF;
  NEW.total_price := LEAST(round(NEW.unit_price * NEW.quantity, 2), 1000000);
  NEW.service_name := s.name;
  RETURN NEW;
END $function$;

-- 2) Deactivated employees lose livechat access
DROP POLICY IF EXISTS "Livechat employees view business conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Livechat employees update business conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Livechat employees view business messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Livechat employees insert business messages" ON public.chat_messages;

CREATE POLICY "Livechat employees view business conversations" ON public.chat_conversations
FOR SELECT TO authenticated USING (business_id IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.employees e WHERE e.business_id = chat_conversations.business_id
    AND e.user_id = auth.uid() AND e.livechat_enabled = true AND e.is_active = true));
CREATE POLICY "Livechat employees update business conversations" ON public.chat_conversations
FOR UPDATE TO authenticated USING (business_id IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.employees e WHERE e.business_id = chat_conversations.business_id
    AND e.user_id = auth.uid() AND e.livechat_enabled = true AND e.is_active = true))
WITH CHECK (business_id IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.employees e WHERE e.business_id = chat_conversations.business_id
    AND e.user_id = auth.uid() AND e.livechat_enabled = true AND e.is_active = true));
CREATE POLICY "Livechat employees view business messages" ON public.chat_messages
FOR SELECT TO authenticated USING (EXISTS (
  SELECT 1 FROM public.chat_conversations c JOIN public.employees e ON e.business_id = c.business_id
  WHERE c.id = chat_messages.conversation_id AND e.user_id = auth.uid() AND e.livechat_enabled = true AND e.is_active = true));
CREATE POLICY "Livechat employees insert business messages" ON public.chat_messages
FOR INSERT TO authenticated WITH CHECK (EXISTS (
  SELECT 1 FROM public.chat_conversations c JOIN public.employees e ON e.business_id = c.business_id
  WHERE c.id = chat_messages.conversation_id AND e.user_id = auth.uid() AND e.livechat_enabled = true AND e.is_active = true));

-- 3) Guest order confirmation capability (hash of a one-time secret generated at checkout)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_confirm_token_hash text;
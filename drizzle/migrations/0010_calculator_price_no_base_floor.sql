CREATE OR REPLACE FUNCTION public._guard_untrusted_order_item()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE o record; s record; v_total numeric := 0; cs record; v_val numeric; v_raw text;
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
    FOR cs IN SELECT id, price_per_unit, min_value, max_value, default_value FROM public.calculator_steps WHERE service_id = s.id LOOP
      v_raw := NULL;
      IF jsonb_typeof(NEW.details->'stepDetails') = 'array' THEN
        SELECT e->>'value' INTO v_raw FROM jsonb_array_elements(NEW.details->'stepDetails') e
          WHERE e->>'id' = cs.id::text LIMIT 1;
      END IF;
      BEGIN v_val := v_raw::numeric; EXCEPTION WHEN others THEN v_val := NULL; END;
      v_val := coalesce(v_val, cs.default_value, cs.min_value, 0);
      v_val := GREATEST(v_val, coalesce(cs.min_value, 0));
      IF cs.max_value IS NOT NULL THEN v_val := LEAST(v_val, cs.max_value); END IF;
      v_total := v_total + v_val * coalesce(cs.price_per_unit, 0);
    END LOOP;
    NEW.unit_price := LEAST(GREATEST(round(v_total, 2), 0), 1000000);
  END IF;
  NEW.total_price := LEAST(round(NEW.unit_price * NEW.quantity, 2), 1000000);
  NEW.service_name := s.name;
  RETURN NEW;
END $function$;
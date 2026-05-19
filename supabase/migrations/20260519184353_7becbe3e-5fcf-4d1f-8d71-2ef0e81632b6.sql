CREATE OR REPLACE FUNCTION public.request_business_deletion_code(p_business_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_owner UUID;
  v_code TEXT;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT owner_id INTO v_owner FROM public.businesses WHERE id = p_business_id;
  IF v_owner IS NULL OR v_owner <> v_user_id THEN RAISE EXCEPTION 'Forbidden'; END IF;

  v_code := lpad(((floor(random() * 90000) + 10000))::int::text, 5, '0');

  UPDATE public.business_deletion_codes
     SET expires_at = now()
   WHERE business_id = p_business_id AND redeemed_at IS NULL AND expires_at > now();

  INSERT INTO public.business_deletion_codes (business_id, code_hash, requested_by_user_id)
  VALUES (p_business_id, encode(extensions.digest(v_code, 'sha256'), 'hex'), v_user_id);

  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_business_deletion(p_business_id UUID, p_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_owner UUID;
  v_row_id UUID;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT owner_id INTO v_owner FROM public.businesses WHERE id = p_business_id;
  IF v_owner IS NULL OR v_owner <> v_user_id THEN RAISE EXCEPTION 'Forbidden'; END IF;

  SELECT id INTO v_row_id
    FROM public.business_deletion_codes
   WHERE business_id = p_business_id
     AND redeemed_at IS NULL
     AND expires_at > now()
     AND code_hash = encode(extensions.digest(p_code, 'sha256'), 'hex')
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_row_id IS NULL THEN RETURN false; END IF;

  UPDATE public.business_deletion_codes SET redeemed_at = now() WHERE id = v_row_id;

  UPDATE public.businesses
     SET is_active = false, deleted_at = now()
   WHERE id = p_business_id;

  UPDATE public.business_plans
     SET deletion_requested_at = now(), status = 'canceled'
   WHERE business_id = p_business_id;

  RETURN true;
END;
$$;
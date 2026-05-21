
-- ============= ADMIN AUDIT LOG =============
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  admin_email text,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  target_label text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON public.admin_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin ON public.admin_audit_log(admin_id);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log"
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Ingen direkte insert-policy — kun via SECURITY DEFINER funktioner.

-- ============= HELPER: log + admin-check =============
CREATE OR REPLACE FUNCTION public._admin_log(
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_target_label text,
  p_details jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.admin_audit_log
    (admin_id, admin_email, action, target_type, target_id, target_label, details)
  VALUES (auth.uid(), v_email, p_action, p_target_type, p_target_id, p_target_label, COALESCE(p_details, '{}'::jsonb));
END;
$$;

-- ============= TRIAL HANDLINGER =============
CREATE OR REPLACE FUNCTION public.admin_extend_trial(
  p_business_id uuid,
  p_days integer
) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_new_end timestamptz;
  v_name text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF p_days IS NULL OR p_days < -365 OR p_days > 365 THEN
    RAISE EXCEPTION 'Days out of range';
  END IF;

  SELECT name INTO v_name FROM businesses WHERE id = p_business_id;

  UPDATE business_plans
  SET trial_ends_at = COALESCE(trial_ends_at, now()) + (p_days || ' days')::interval,
      status = CASE WHEN status = 'active' THEN status ELSE 'trialing' END,
      updated_at = now()
  WHERE business_id = p_business_id
  RETURNING trial_ends_at INTO v_new_end;

  IF v_new_end IS NULL THEN
    -- Opret plan-række hvis den ikke findes
    INSERT INTO business_plans (business_id, trial_ends_at, status)
    VALUES (p_business_id, now() + (p_days || ' days')::interval, 'trialing')
    RETURNING trial_ends_at INTO v_new_end;
  END IF;

  PERFORM public._admin_log(
    'extend_trial', 'business', p_business_id, v_name,
    jsonb_build_object('days', p_days, 'new_trial_ends_at', v_new_end)
  );
  RETURN v_new_end;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reset_trial(
  p_business_id uuid,
  p_days integer DEFAULT 14
) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_new_end timestamptz;
  v_name text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  v_new_end := now() + (p_days || ' days')::interval;
  SELECT name INTO v_name FROM businesses WHERE id = p_business_id;

  UPDATE business_plans
  SET trial_ends_at = v_new_end,
      status = 'trialing',
      stripe_payment_method_last4 = NULL,
      stripe_payment_method_brand = NULL,
      updated_at = now()
  WHERE business_id = p_business_id;

  IF NOT FOUND THEN
    INSERT INTO business_plans (business_id, trial_ends_at, status)
    VALUES (p_business_id, v_new_end, 'trialing');
  END IF;

  UPDATE businesses SET is_active = true WHERE id = p_business_id;

  PERFORM public._admin_log(
    'reset_trial', 'business', p_business_id, v_name,
    jsonb_build_object('days', p_days, 'new_trial_ends_at', v_new_end)
  );
  RETURN v_new_end;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_end_trial_now(
  p_business_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT name INTO v_name FROM businesses WHERE id = p_business_id;

  UPDATE business_plans
  SET trial_ends_at = now() - interval '1 second',
      updated_at = now()
  WHERE business_id = p_business_id;

  PERFORM public._admin_log('end_trial_now', 'business', p_business_id, v_name, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_force_active(
  p_business_id uuid,
  p_note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT name INTO v_name FROM businesses WHERE id = p_business_id;

  UPDATE business_plans SET status = 'active', updated_at = now()
  WHERE business_id = p_business_id;

  IF NOT FOUND THEN
    INSERT INTO business_plans (business_id, status) VALUES (p_business_id, 'active');
  END IF;

  UPDATE businesses SET is_active = true WHERE id = p_business_id;

  PERFORM public._admin_log(
    'force_active', 'business', p_business_id, v_name,
    jsonb_build_object('note', p_note)
  );
END;
$$;

-- ============= OVERDRAG EJER =============
CREATE OR REPLACE FUNCTION public.admin_transfer_business_owner(
  p_business_id uuid,
  p_new_owner_email text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_new_owner_id uuid;
  v_old_owner_id uuid;
  v_name text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT id INTO v_new_owner_id FROM auth.users WHERE lower(email) = lower(p_new_owner_email);
  IF v_new_owner_id IS NULL THEN
    RAISE EXCEPTION 'Bruger findes ikke: %', p_new_owner_email;
  END IF;

  SELECT owner_id, name INTO v_old_owner_id, v_name FROM businesses WHERE id = p_business_id;

  UPDATE businesses SET owner_id = v_new_owner_id, updated_at = now() WHERE id = p_business_id;

  PERFORM public._admin_log(
    'transfer_owner', 'business', p_business_id, v_name,
    jsonb_build_object('old_owner', v_old_owner_id, 'new_owner', v_new_owner_id, 'new_owner_email', p_new_owner_email)
  );
  RETURN v_new_owner_id;
END;
$$;

-- ============= SOFT/HARD DELETE =============
CREATE OR REPLACE FUNCTION public.admin_soft_delete_business(
  p_business_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT name INTO v_name FROM businesses WHERE id = p_business_id;

  UPDATE businesses
  SET deleted_at = now(), is_active = false, updated_at = now()
  WHERE id = p_business_id;

  UPDATE business_plans
  SET deletion_requested_at = COALESCE(deletion_requested_at, now()), updated_at = now()
  WHERE business_id = p_business_id;

  PERFORM public._admin_log('soft_delete', 'business', p_business_id, v_name, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_restore_business(
  p_business_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT name INTO v_name FROM businesses WHERE id = p_business_id;

  UPDATE businesses
  SET deleted_at = NULL, is_active = true, updated_at = now()
  WHERE id = p_business_id;

  UPDATE business_plans
  SET deletion_requested_at = NULL, updated_at = now()
  WHERE business_id = p_business_id;

  PERFORM public._admin_log('restore', 'business', p_business_id, v_name, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_hard_delete_business(
  p_business_id uuid,
  p_confirm_name text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT name INTO v_name FROM businesses WHERE id = p_business_id;
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Business not found';
  END IF;
  IF p_confirm_name IS NULL OR p_confirm_name <> v_name THEN
    RAISE EXCEPTION 'Confirmation name does not match';
  END IF;

  -- Log FØR sletning så vi har sporet
  PERFORM public._admin_log(
    'hard_delete', 'business', p_business_id, v_name,
    jsonb_build_object('permanent', true)
  );

  DELETE FROM businesses WHERE id = p_business_id;
END;
$$;

-- ============= GRANTS =============
GRANT EXECUTE ON FUNCTION public.admin_extend_trial(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_trial(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_end_trial_now(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_force_active(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_transfer_business_owner(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_soft_delete_business(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_restore_business(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_hard_delete_business(uuid, text) TO authenticated;

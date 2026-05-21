
-- Trin 24: admin_unsuppress_email — fjerner en email fra suppression-listen
CREATE OR REPLACE FUNCTION public.admin_unsuppress_email(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_reason text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT email, reason INTO v_email, v_reason
  FROM public.suppressed_emails
  WHERE id = p_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Suppression not found';
  END IF;

  DELETE FROM public.suppressed_emails WHERE id = p_id;

  PERFORM public._admin_log(
    'unsuppress_email',
    'email',
    v_email,
    jsonb_build_object('reason', v_reason)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_unsuppress_email(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_unsuppress_email(uuid) TO authenticated;

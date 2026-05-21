
CREATE OR REPLACE FUNCTION public.admin_health_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_email jsonb;
  v_email_24h jsonb;
  v_suppressed_total bigint;
  v_suppressed_by_reason jsonb;
  v_notif_pending bigint;
  v_notif_failed_24h bigint;
  v_notif_oldest_pending timestamptz;
  v_dlq_unresolved bigint;
  v_dlq_24h bigint;
  v_audit_24h bigint;
  v_audit_top_actions jsonb;
  v_sync_queue_pending bigint;
  v_sync_queue_failed bigint;
BEGIN
  SELECT has_role(auth.uid(), 'admin') INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- Email log: last 7 days, grouped by status
  SELECT jsonb_object_agg(status, n) INTO v_email
  FROM (
    SELECT status, count(*) AS n
    FROM email_send_log
    WHERE created_at > now() - interval '7 days'
    GROUP BY status
  ) s;

  -- Email last 24h
  SELECT jsonb_object_agg(status, n) INTO v_email_24h
  FROM (
    SELECT status, count(*) AS n
    FROM email_send_log
    WHERE created_at > now() - interval '24 hours'
    GROUP BY status
  ) s;

  SELECT count(*) INTO v_suppressed_total FROM suppressed_emails;
  SELECT jsonb_object_agg(reason, n) INTO v_suppressed_by_reason
  FROM (SELECT reason, count(*) n FROM suppressed_emails GROUP BY reason) s;

  SELECT count(*) INTO v_notif_pending FROM customer_notification_queue WHERE status = 'pending';
  SELECT count(*) INTO v_notif_failed_24h
  FROM customer_notification_queue
  WHERE status = 'failed' AND created_at > now() - interval '24 hours';
  SELECT min(send_at) INTO v_notif_oldest_pending FROM customer_notification_queue WHERE status = 'pending';

  SELECT count(*) INTO v_dlq_unresolved FROM accounting_sync_dlq WHERE resolved = false;
  SELECT count(*) INTO v_dlq_24h FROM accounting_sync_dlq WHERE moved_to_dlq_at > now() - interval '24 hours';

  SELECT count(*) INTO v_audit_24h FROM admin_audit_log WHERE created_at > now() - interval '24 hours';
  SELECT jsonb_agg(jsonb_build_object('action', action, 'n', n) ORDER BY n DESC) INTO v_audit_top_actions
  FROM (
    SELECT action, count(*) n
    FROM admin_audit_log
    WHERE created_at > now() - interval '7 days'
    GROUP BY action
    ORDER BY n DESC
    LIMIT 6
  ) s;

  BEGIN
    EXECUTE 'SELECT count(*) FROM accounting_sync_queue WHERE status = $1' INTO v_sync_queue_pending USING 'pending';
    EXECUTE 'SELECT count(*) FROM accounting_sync_queue WHERE status = $1' INTO v_sync_queue_failed USING 'failed';
  EXCEPTION WHEN OTHERS THEN
    v_sync_queue_pending := 0;
    v_sync_queue_failed := 0;
  END;

  RETURN jsonb_build_object(
    'email_7d', coalesce(v_email, '{}'::jsonb),
    'email_24h', coalesce(v_email_24h, '{}'::jsonb),
    'suppressed_total', v_suppressed_total,
    'suppressed_by_reason', coalesce(v_suppressed_by_reason, '{}'::jsonb),
    'notif_pending', v_notif_pending,
    'notif_failed_24h', v_notif_failed_24h,
    'notif_oldest_pending', v_notif_oldest_pending,
    'dlq_unresolved', v_dlq_unresolved,
    'dlq_24h', v_dlq_24h,
    'sync_queue_pending', v_sync_queue_pending,
    'sync_queue_failed', v_sync_queue_failed,
    'audit_24h', v_audit_24h,
    'audit_top_actions', coalesce(v_audit_top_actions, '[]'::jsonb),
    'generated_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_health_stats() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_health_stats() TO authenticated;

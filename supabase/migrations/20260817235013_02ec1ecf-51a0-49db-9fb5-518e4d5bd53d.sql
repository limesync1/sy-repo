-- 1) Lock down SECURITY DEFINER functions in public schema
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- Re-grant only the RPCs the app actually calls
DO $$
DECLARE r record;
  auth_fns text[] := ARRAY[
    '_admin_log','accept_dpa','accounting_health_check_run','accounting_health_summary',
    'add_route_stop_idempotent','admin_business_stats','admin_create_impersonation_code',
    'admin_email_distinct_templates','admin_email_send_log','admin_end_trial_now','admin_extend_trial',
    'admin_force_active','admin_hard_delete_business','admin_health_extended','admin_health_stats',
    'admin_list_businesses','admin_list_orders','admin_list_users','admin_list_users_v2',
    'admin_mark_notifications_seen','admin_notification_feed','admin_notifications_last_seen',
    'admin_overview_snapshot','admin_redeem_impersonation_code','admin_reset_trial','admin_restore_business',
    'admin_security_overview','admin_set_user_role','admin_soft_delete_business','admin_suppressed_emails',
    'admin_transfer_business_owner','admin_unsuppress_email','admin_user_activity_timeline',
    'bulk_shift_routes','claim_route_planner_idempotency','close_chat_conversation_by_token',
    'confirm_business_deletion','create_route_fast','delete_cancelled_order','delete_email',
    'dismiss_dlq_job','enqueue_email','get_chat_conversation_by_token','get_chat_messages_by_token',
    'get_customer_notification_pref','get_order_for_approval','get_platform_pricing','get_public_profiles',
    'get_quote_request_contacts','get_route_calendar','has_role','is_route_owner','log_route_audit',
    'log_route_planner_event','mark_chat_read_by_token','materialize_my_day_routes_for_employee',
    'materialize_virtual_route','move_route_to_date','move_stops_to_date','move_stops_to_route',
    'move_to_dlq','pick_route_color','read_email_batch','remove_route_stop_safely','reopen_route',
    'reorder_route_stops','request_business_deletion_code','retry_dlq_job','revert_projected_shift',
    'route_audit_feed','send_chat_message_by_token','shift_projected_occurrence','snapshot_route',
    'suggest_routes_for_stop','try_claim_route_mutation','business_has_active_plan'
  ];
  anon_fns text[] := ARRAY[
    'get_chat_conversation_by_token','get_chat_messages_by_token','send_chat_message_by_token',
    'mark_chat_read_by_token','close_chat_conversation_by_token','get_platform_pricing','get_public_profiles'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    IF r.proname = ANY(auth_fns) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END IF;
    IF r.proname = ANY(anon_fns) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', r.sig);
    END IF;
  END LOOP;
END $$;

-- 2) Remove Stripe secrets from the database
ALTER TABLE public.platform_settings
  DROP COLUMN IF EXISTS stripe_secret_key,
  DROP COLUMN IF EXISTS stripe_webhook_secret;

-- 3) Public buckets: keep public URL access, stop object listing
DROP POLICY IF EXISTS "Business assets are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

-- 4) Cron jobs must use the shared cron secret, not the public anon key
DO $$
DECLARE v_secret text := '8jawldn29nadi92akdn920sn';
BEGIN
  PERFORM cron.unschedule('customer-notifications-dispatch-every-5-min');
  PERFORM cron.unschedule('recurring-orders-daily');
  PERFORM cron.unschedule('materialize-next-occurrences-nightly');

  PERFORM cron.schedule('customer-notifications-dispatch-every-5-min', '*/5 * * * *', format($c$
    SELECT net.http_post(
      url := 'https://gkectsellkpltrxvusot.supabase.co/functions/v1/customer-notifications-dispatch',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s'),
      body := '{}'::jsonb
    );
  $c$, v_secret));

  PERFORM cron.schedule('recurring-orders-daily', '0 2 * * *', format($c$
    SELECT net.http_post(
      url := 'https://gkectsellkpltrxvusot.supabase.co/functions/v1/recurring-orders',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s'),
      body := '{}'::jsonb
    );
  $c$, v_secret));

  PERFORM cron.schedule('materialize-next-occurrences-nightly', '0 3 * * *', format($c$
    SELECT net.http_post(
      url := 'https://gkectsellkpltrxvusot.supabase.co/functions/v1/materialize-next-occurrences',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s'),
      body := '{"source":"pg_cron"}'::jsonb
    );
  $c$, v_secret));
END $$;
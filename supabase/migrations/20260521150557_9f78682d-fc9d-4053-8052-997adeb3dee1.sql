
CREATE TABLE IF NOT EXISTS public.admin_notification_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notification_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_state_select_own" ON public.admin_notification_state;
CREATE POLICY "admin_state_select_own" ON public.admin_notification_state
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_state_upsert_own" ON public.admin_notification_state;
CREATE POLICY "admin_state_upsert_own" ON public.admin_notification_state
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_state_update_own" ON public.admin_notification_state;
CREATE POLICY "admin_state_update_own" ON public.admin_notification_state
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


CREATE OR REPLACE FUNCTION public.admin_notification_feed(p_limit int DEFAULT 30)
RETURNS TABLE (
  id text,
  category text,
  severity text,
  title text,
  subtitle text,
  link_tab text,
  link_id text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  WITH events AS (
    -- New businesses (last 7 days)
    SELECT
      'biz:' || b.id::text AS id,
      'new_business' AS category,
      'info' AS severity,
      'Ny virksomhed' AS title,
      b.name AS subtitle,
      'businesses' AS link_tab,
      b.id::text AS link_id,
      b.created_at
    FROM businesses b
    WHERE b.created_at > now() - interval '7 days'

    UNION ALL
    -- Trials expiring in next 3 days
    SELECT
      'trial:' || bp.id::text,
      'trial_expiring',
      'warn',
      'Prøveperiode udløber',
      coalesce(b.name, 'Virksomhed') || ' — udløber ' ||
        to_char(bp.trial_ends_at, 'DD. Mon'),
      'subscriptions',
      bp.business_id::text,
      bp.trial_ends_at
    FROM business_plans bp
    JOIN businesses b ON b.id = bp.business_id
    WHERE bp.status = 'trialing'
      AND bp.trial_ends_at IS NOT NULL
      AND bp.trial_ends_at BETWEEN now() AND now() + interval '3 days'

    UNION ALL
    -- Overdue unpaid orders
    SELECT
      'order:' || o.id::text,
      'order_overdue',
      'danger',
      'Forfalden ordre',
      coalesce(o.customer_name, '') || ' · ' ||
        to_char(o.total_amount, 'FM999G999') || ' kr',
      'orders',
      o.id::text,
      (o.due_date::timestamptz)
    FROM orders o
    WHERE o.due_date IS NOT NULL
      AND o.due_date < current_date
      AND (o.payment_status IS NULL OR o.payment_status <> 'paid')
      AND o.due_date > current_date - interval '60 days'

    UNION ALL
    -- Unread chat messages
    SELECT
      'chat:' || c.id::text,
      'chat_unread',
      'info',
      'Ulæst chat-besked',
      coalesce(c.visitor_name, c.visitor_email) ||
        ' (' || c.unread_admin_count::text || ')',
      'livechat',
      c.id::text,
      c.last_message_at
    FROM chat_conversations c
    WHERE c.unread_admin_count > 0
      AND c.status = 'open'
      AND c.last_message_at > now() - interval '14 days'

    UNION ALL
    -- Failed emails (last 24h, deduped by message_id)
    SELECT
      'mail:' || e.message_id,
      'mail_failed',
      'danger',
      'E-mail fejlede',
      e.recipient_email || ' · ' || e.template_name,
      'mails',
      NULL,
      e.created_at
    FROM (
      SELECT DISTINCT ON (message_id)
        message_id, recipient_email, template_name, status, created_at
      FROM email_send_log
      WHERE message_id IS NOT NULL
        AND created_at > now() - interval '24 hours'
      ORDER BY message_id, created_at DESC
    ) e
    WHERE e.status IN ('failed', 'bounced', 'complained', 'dlq')
  )
  SELECT events.id, events.category, events.severity, events.title,
         events.subtitle, events.link_tab, events.link_id, events.created_at
  FROM events
  ORDER BY events.created_at DESC
  LIMIT greatest(1, least(p_limit, 100));
END;
$$;


CREATE OR REPLACE FUNCTION public.admin_mark_notifications_seen()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  INSERT INTO admin_notification_state (user_id, last_seen_at, updated_at)
  VALUES (auth.uid(), v_now, v_now)
  ON CONFLICT (user_id) DO UPDATE SET last_seen_at = v_now, updated_at = v_now;
  RETURN v_now;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_notifications_last_seen()
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT last_seen_at FROM admin_notification_state WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.admin_notification_feed(int) FROM public;
REVOKE ALL ON FUNCTION public.admin_mark_notifications_seen() FROM public;
REVOKE ALL ON FUNCTION public.admin_notifications_last_seen() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_notification_feed(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mark_notifications_seen() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_notifications_last_seen() TO authenticated;

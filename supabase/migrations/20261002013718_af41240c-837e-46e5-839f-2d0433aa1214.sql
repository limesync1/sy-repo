CREATE OR REPLACE FUNCTION public.admin_notification_feed(p_limit integer DEFAULT 30)
 RETURNS TABLE(id text, category text, severity text, title text, subtitle text, link_tab text, link_id text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  WITH events AS (
    SELECT 'biz:' || b.id::text AS id, 'new_business' AS category, 'info' AS severity,
      'Ny virksomhed' AS title, b.name AS subtitle, 'businesses' AS link_tab, b.id::text AS link_id, b.created_at AS ts
    FROM businesses b
    WHERE b.created_at > now() - interval '7 days'
    UNION ALL
    SELECT 'trial:' || bp.id::text, 'trial_expiring', 'warn', 'Prøveperiode udløber',
      coalesce(b.name, 'Virksomhed') || ' — udløber ' || to_char(bp.trial_ends_at, 'DD. Mon'),
      'subscriptions', bp.business_id::text, bp.trial_ends_at
    FROM business_plans bp JOIN businesses b ON b.id = bp.business_id
    WHERE bp.status = 'trialing' AND bp.trial_ends_at IS NOT NULL
      AND bp.trial_ends_at BETWEEN now() AND now() + interval '3 days'
    UNION ALL
    SELECT 'order:' || o.id::text, 'order_overdue', 'danger', 'Forfalden ordre',
      coalesce(o.customer_name, '') || ' · ' || to_char(o.total_amount, 'FM999G999') || ' kr',
      'orders', o.id::text, (o.due_date::timestamptz)
    FROM orders o
    WHERE o.due_date IS NOT NULL AND o.due_date < current_date
      AND (o.payment_status IS NULL OR o.payment_status <> 'paid')
      AND o.due_date > current_date - interval '60 days'
    UNION ALL
    SELECT 'chat:' || c.id::text, 'chat_unread', 'info', 'Ulæst chat-besked',
      coalesce(c.visitor_name, c.visitor_email) || ' (' || c.unread_admin_count::text || ')',
      'livechat', c.id::text, c.last_message_at
    FROM chat_conversations c
    WHERE c.unread_admin_count > 0 AND c.status = 'open'
      AND c.last_message_at > now() - interval '14 days'
    UNION ALL
    SELECT 'mail:' || e.message_id, 'mail_failed', 'danger', 'E-mail fejlede',
      e.recipient_email || ' · ' || e.template_name, 'mails', NULL, e.sent_at
    FROM (
      SELECT DISTINCT ON (l.message_id)
        l.message_id, l.recipient_email, l.template_name, l.status, l.created_at AS sent_at
      FROM email_send_log l
      WHERE l.message_id IS NOT NULL AND l.created_at > now() - interval '24 hours'
      ORDER BY l.message_id, l.created_at DESC
    ) e
    WHERE e.status IN ('failed', 'bounced', 'complained', 'dlq')
  )
  SELECT ev.id, ev.category, ev.severity, ev.title, ev.subtitle, ev.link_tab, ev.link_id, ev.ts
  FROM events ev
  ORDER BY ev.ts DESC
  LIMIT greatest(1, least(p_limit, 100));
END;
$function$;
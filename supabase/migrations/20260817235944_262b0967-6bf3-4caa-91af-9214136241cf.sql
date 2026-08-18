CREATE OR REPLACE FUNCTION public._chat_messages_antispam()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_10s int;
  v_recent_60s int;
  v_dupe int;
  v_links int;
  v_visitor_msgs int;
BEGIN
  -- System/automated messages are not rate limited
  IF coalesce(NEW.is_system, false) THEN
    RETURN NEW;
  END IF;

  NEW.content := left(coalesce(NEW.content, ''), 2000);
  IF nullif(btrim(NEW.content), '') IS NULL AND NEW.image_url IS NULL THEN
    RAISE EXCEPTION 'Tom besked';
  END IF;

  SELECT
    count(*) FILTER (WHERE created_at > now() - interval '10 seconds'),
    count(*) FILTER (WHERE created_at > now() - interval '60 seconds'),
    count(*) FILTER (
      WHERE created_at > now() - interval '30 seconds'
        AND coalesce(content, '') = coalesce(NEW.content, '')
        AND nullif(btrim(coalesce(content, '')), '') IS NOT NULL
    )
  INTO v_recent_10s, v_recent_60s, v_dupe
  FROM public.chat_messages
  WHERE conversation_id = NEW.conversation_id
    AND sender_type = NEW.sender_type
    AND coalesce(is_system, false) = false
    AND created_at > now() - interval '60 seconds';

  IF v_recent_10s >= 5 THEN
    RAISE EXCEPTION 'Du sender beskeder for hurtigt. Vent et par sekunder og prøv igen.';
  END IF;

  IF v_recent_60s >= 20 THEN
    RAISE EXCEPTION 'For mange beskeder på kort tid. Vent et minut og prøv igen.';
  END IF;

  IF v_dupe > 0 THEN
    RAISE EXCEPTION 'Du har lige sendt den samme besked. Prøv igen om lidt.';
  END IF;

  -- Link spam protection (visitors only)
  IF NEW.sender_type = 'visitor' THEN
    v_links := coalesce(array_length(
      regexp_split_to_array(lower(coalesce(NEW.content, '')), '(https?://|www\.)'), 1
    ), 1) - 1;

    IF v_links > 3 THEN
      RAISE EXCEPTION 'Beskeden indeholder for mange links.';
    END IF;

    IF v_links > 0 THEN
      SELECT count(*) INTO v_visitor_msgs
      FROM public.chat_messages
      WHERE conversation_id = NEW.conversation_id
        AND sender_type = 'visitor'
        AND coalesce(is_system, false) = false;

      IF v_visitor_msgs < 2 THEN
        RAISE EXCEPTION 'Skriv venligst din besked uden links til at starte med.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_messages_antispam ON public.chat_messages;
CREATE TRIGGER chat_messages_antispam
BEFORE INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public._chat_messages_antispam();

CREATE OR REPLACE FUNCTION public._chat_conversations_antispam()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_by_email int;
  v_by_business int;
BEGIN
  IF nullif(btrim(coalesce(NEW.visitor_email, '')), '') IS NOT NULL THEN
    SELECT count(*) INTO v_by_email
    FROM public.chat_conversations
    WHERE lower(coalesce(visitor_email, '')) = lower(NEW.visitor_email)
      AND created_at > now() - interval '1 hour';

    IF v_by_email >= 5 THEN
      RAISE EXCEPTION 'Du har startet for mange samtaler. Prøv igen senere.';
    END IF;
  END IF;

  IF NEW.user_id IS NULL THEN
    SELECT count(*) INTO v_by_business
    FROM public.chat_conversations
    WHERE user_id IS NULL
      AND coalesce(business_id::text, '-') = coalesce(NEW.business_id::text, '-')
      AND created_at > now() - interval '1 hour';

    IF v_by_business >= 20 THEN
      RAISE EXCEPTION 'Chatten er midlertidigt overbelastet. Prøv igen om lidt.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_conversations_antispam ON public.chat_conversations;
CREATE TRIGGER chat_conversations_antispam
BEFORE INSERT ON public.chat_conversations
FOR EACH ROW EXECUTE FUNCTION public._chat_conversations_antispam();

CREATE INDEX IF NOT EXISTS idx_chat_messages_conv_sender_created
  ON public.chat_messages (conversation_id, sender_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_created_at
  ON public.chat_conversations (created_at DESC);
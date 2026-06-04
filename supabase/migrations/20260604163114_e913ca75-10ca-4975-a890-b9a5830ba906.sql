CREATE OR REPLACE FUNCTION public._test_completion_guard(_planned timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_diff interval;
  v_when text;
  v_remaining text;
BEGIN
  IF _planned IS NULL OR _planned <= now() THEN
    RETURN jsonb_build_object('ok', true);
  END IF;

  v_diff := _planned - now();
  v_when := to_char(_planned AT TIME ZONE 'Europe/Copenhagen', 'DD-MM-YYYY "kl." HH24:MI');
  IF v_diff < interval '1 hour' THEN
    v_remaining := format('om %s min', extract(epoch from v_diff)::int / 60);
  ELSIF v_diff < interval '1 day' THEN
    v_remaining := format('om %s t %s min',
      extract(epoch from v_diff)::int / 3600,
      (extract(epoch from v_diff)::int % 3600) / 60);
  ELSE
    v_remaining := format('om %s dage', extract(day from v_diff)::int);
  END IF;

  RETURN jsonb_build_object(
    'ok', false,
    'error', format('Kan først udføres %s (dansk tid) — %s', v_when, v_remaining),
    'hint', 'OCCURRENCE_NOT_YET_DUE'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public._test_completion_guard(timestamptz) TO anon, authenticated;
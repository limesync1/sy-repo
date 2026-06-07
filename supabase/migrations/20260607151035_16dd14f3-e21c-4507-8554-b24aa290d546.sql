
-- 1) Tilføj time-/minut-genkendelse til interval_to_duration så fremtidige
--    timer-baserede intervaller har en kanonisk varighed at falde tilbage på.
CREATE OR REPLACE FUNCTION public.interval_to_duration(_interval text)
RETURNS interval
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v text := lower(trim(coalesce(_interval, '')));
  m text[];
  n int;
  u text;
BEGIN
  IF v = '' OR v IN ('engangskøb', 'engangskob', 'once') THEN
    RETURN NULL;
  END IF;

  CASE v
    WHEN '10_min'      THEN RETURN interval '10 minutes';
    WHEN 'daglig'      THEN RETURN interval '1 day';
    WHEN 'hver_2_dag'  THEN RETURN interval '2 days';
    WHEN 'ugentlig'    THEN RETURN interval '1 week';
    WHEN 'hver_14_dag' THEN RETURN interval '2 weeks';
    WHEN 'hver_3_uge'  THEN RETURN interval '3 weeks';
    WHEN 'hver_4_uge'  THEN RETURN interval '4 weeks';
    WHEN 'hver_8_uge'  THEN RETURN interval '8 weeks';
    WHEN 'månedlig'    THEN RETURN interval '1 month';
    WHEN 'kvartalsvis' THEN RETURN interval '3 months';
    WHEN 'halvårlig'   THEN RETURN interval '6 months';
    WHEN 'årlig'       THEN RETURN interval '1 year';
    ELSE NULL;
  END CASE;

  -- Minut-/time-cadence (fx "10_min", "every_1_hour", "hver 2 time")
  m := regexp_match(v, '^(?:every[_:])?(\d+)[_ :]?(min|minute|minutes|minut|minutter|hour|hours|time|timer)s?$');
  IF m IS NOT NULL THEN
    n := greatest(1, m[1]::int);
    u := m[2];
    IF u IN ('min','minute','minutes','minut','minutter') THEN
      RETURN make_interval(mins => n);
    ELSE
      RETURN make_interval(hours => n);
    END IF;
  END IF;

  v := regexp_replace(replace(replace(replace(v, '.', ''), '_', ' '), '-', ' '), '\s+', ' ', 'g');
  m := regexp_match(v, '^(?:hver|hvert|every)\s+(\d+)\s+(day|days|dag|dage|week|weeks|uge|uger|month|months|måned|maaned|måneder|maaneder|year|years|år|aar|hour|hours|time|timer|min|minute|minutes|minut|minutter)$');
  IF m IS NOT NULL THEN
    n := greatest(1, m[1]::int);
    u := m[2];
    IF u IN ('day','days','dag','dage') THEN
      RETURN make_interval(days => n);
    ELSIF u IN ('week','weeks','uge','uger') THEN
      RETURN make_interval(weeks => n);
    ELSIF u IN ('month','months','måned','maaned','måneder','maaneder') THEN
      RETURN make_interval(months => n);
    ELSIF u IN ('year','years','år','aar') THEN
      RETURN make_interval(years => n);
    ELSIF u IN ('hour','hours','time','timer') THEN
      RETURN make_interval(hours => n);
    ELSIF u IN ('min','minute','minutes','minut','minutter') THEN
      RETURN make_interval(mins => n);
    END IF;
  END IF;

  RETURN NULL;
END;
$function$;

-- 2) Hård cap: max 1 forekomst pr. dag pr. aftale.
--    Når en forekomst markeres som udført spawner vi næste — men selv hvis
--    intervallet er 10 minutter eller 1 time, må næste forekomst tidligst
--    være DAGEN EFTER. Dette gælder ALLE aftaler (test-servicen er ingen
--    undtagelse — kun dens UI-label vises som "Hver 1 time").
CREATE OR REPLACE FUNCTION public.ensure_next_agreement_occurrence(_completed_occurrence_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_occ public.agreement_occurrences%ROWTYPE;
  v_agreement public.agreements%ROWTYPE;
  v_duration interval;
  v_next_date date;
  v_next_idx int;
  v_next_id uuid;
  v_route_id uuid;
  v_planned_arrival timestamptz;
BEGIN
  SELECT * INTO v_occ FROM public.agreement_occurrences WHERE id = _completed_occurrence_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_agreement FROM public.agreements WHERE id = v_occ.agreement_id;
  IF NOT FOUND OR v_agreement.status <> 'active' THEN RETURN NULL; END IF;

  v_duration := public._agreement_interval_duration(v_agreement.interval, v_agreement.interval_days);
  IF v_duration IS NULL THEN RETURN NULL; END IF;

  v_next_date := (v_occ.occurrence_date::timestamp + v_duration)::date;
  -- HÅRD CAP: én forekomst pr. dag, uanset interval. Hvis næste forekomst
  -- ville lande samme dag (fx ved minut-/time-baserede intervaller), rykker
  -- vi den til dagen efter den netop udførte forekomst.
  IF v_next_date <= v_occ.occurrence_date THEN
    v_next_date := v_occ.occurrence_date + 1;
  END IF;
  IF v_agreement.end_date IS NOT NULL AND v_next_date > v_agreement.end_date THEN
    RETURN NULL;
  END IF;

  -- Hvis der allerede findes en åben forekomst på næste dato, returnér den
  -- i stedet for at oprette en duplikat — undgår at en igangværende kø af
  -- fremtidige stops bliver "fjernet" af triggers (cross-route guard) når
  -- en duplikat oprettes for samme aftale/dag.
  SELECT id INTO v_next_id
    FROM public.agreement_occurrences
   WHERE agreement_id = v_agreement.id
     AND occurrence_date = v_next_date
     AND completed_at IS NULL
   ORDER BY sequence_index ASC NULLS LAST
   LIMIT 1;
  IF v_next_id IS NOT NULL THEN
    RETURN v_next_id;
  END IF;

  SELECT COALESCE(MAX(sequence_index), -1) + 1 INTO v_next_idx
    FROM public.agreement_occurrences WHERE agreement_id = v_agreement.id;
  v_next_idx := GREATEST(v_next_idx, COALESCE(v_occ.sequence_index, -1) + 1);

  SELECT id INTO v_route_id
    FROM public.routes
   WHERE business_id = v_agreement.business_id
     AND route_date = v_next_date
     AND (
       id = v_agreement.preferred_route_id
       OR base_route_id = v_agreement.preferred_route_id
       OR route_template_id = v_agreement.default_route_template_id
     )
   ORDER BY CASE WHEN base_route_id = v_agreement.preferred_route_id THEN 0 ELSE 1 END, created_at
   LIMIT 1;

  IF v_agreement.preferred_time_start IS NOT NULL THEN
    v_planned_arrival := ((v_next_date::timestamp + v_agreement.preferred_time_start) AT TIME ZONE 'Europe/Copenhagen');
  ELSE
    v_planned_arrival := NULL;
  END IF;

  INSERT INTO public.agreement_occurrences (
    agreement_id, occurrence_date, sequence_index, status, route_id, planned_arrival, total_amount, created_at, updated_at
  ) VALUES (
    v_agreement.id, v_next_date, v_next_idx, 'planned', v_route_id, v_planned_arrival, v_occ.total_amount, now(), now()
  )
  ON CONFLICT (agreement_id, sequence_index) DO UPDATE
    SET occurrence_date = EXCLUDED.occurrence_date
  RETURNING id INTO v_next_id;

  RETURN v_next_id;
END;
$function$;

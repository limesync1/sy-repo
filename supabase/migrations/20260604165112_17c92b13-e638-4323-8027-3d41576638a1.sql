-- Fase 5 — Hybrid materialisering.
-- Pre-materialiserer agreement_occurrences + route_stops for et rullende
-- 30-dages vindue, så ruteplanlæggeren kan operere på rigtige DB-rækker
-- frem for klient-projektioner i nær-fremtiden.

CREATE OR REPLACE FUNCTION public.materialize_upcoming_occurrences(_window_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business RECORD;
  v_agreement RECORD;
  v_step int;
  v_date date;
  v_idx int;
  v_horizon date;
  v_inserted_occ int := 0;
  v_business_count int := 0;
  v_occ RECORD;
  v_materialized int := 0;
BEGIN
  -- Service-only entry point (cron). Afvis hvis kaldt med JWT — almindelige
  -- brugere skal bruge ensure_agreement_occurrences pr. business.
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'materialize_upcoming_occurrences kun tilgængelig for cron/admin';
  END IF;

  v_horizon := current_date + (_window_days || ' days')::interval;

  -- 1) Sørg for at agreement_occurrences findes for hele vinduet.
  FOR v_business IN
    SELECT DISTINCT business_id FROM public.agreements
    WHERE status IN ('active','pending_approval')
      AND start_date <= v_horizon
  LOOP
    v_business_count := v_business_count + 1;
    FOR v_agreement IN
      SELECT * FROM public.agreements
      WHERE business_id = v_business.business_id
        AND status IN ('active','pending_approval')
        AND start_date <= v_horizon
    LOOP
      v_step := public.agreement_interval_days(v_agreement.interval, v_agreement.interval_days);
      v_date := v_agreement.start_date;
      v_idx := 0;

      IF v_step IS NULL THEN
        IF v_date <= v_horizon
           AND (v_agreement.end_date IS NULL OR v_date <= v_agreement.end_date) THEN
          INSERT INTO public.agreement_occurrences
            (agreement_id, business_id, occurrence_date, sequence_index, employee_ids, planned_arrival)
          VALUES
            (v_agreement.id, v_agreement.business_id, v_date, 0, v_agreement.employee_ids,
             CASE WHEN v_agreement.preferred_time_start IS NOT NULL
                  THEN ((v_date::timestamp + v_agreement.preferred_time_start) AT TIME ZONE 'Europe/Copenhagen')
                  ELSE NULL END)
          ON CONFLICT (agreement_id, occurrence_date) DO NOTHING;
          IF FOUND THEN v_inserted_occ := v_inserted_occ + 1; END IF;
        END IF;
        CONTINUE;
      END IF;

      WHILE v_date <= v_horizon LOOP
        EXIT WHEN v_agreement.end_date IS NOT NULL AND v_date > v_agreement.end_date;
        INSERT INTO public.agreement_occurrences
          (agreement_id, business_id, occurrence_date, sequence_index, employee_ids, planned_arrival)
        VALUES
          (v_agreement.id, v_agreement.business_id, v_date, v_idx, v_agreement.employee_ids,
           CASE WHEN v_agreement.preferred_time_start IS NOT NULL
                THEN ((v_date::timestamp + v_agreement.preferred_time_start) AT TIME ZONE 'Europe/Copenhagen')
                ELSE NULL END)
        ON CONFLICT (agreement_id, occurrence_date) DO NOTHING;
        IF FOUND THEN v_inserted_occ := v_inserted_occ + 1; END IF;
        v_idx := v_idx + 1;
        v_date := v_date + (v_step || ' days')::interval;
      END LOOP;
    END LOOP;
  END LOOP;

  -- 2) Materialisér de planlagte forekomster i vinduet til route_stops.
  FOR v_occ IN
    SELECT id
    FROM public.agreement_occurrences
    WHERE occurrence_date BETWEEN current_date AND v_horizon
      AND route_id IS NULL
      AND status = 'planned'
  LOOP
    BEGIN
      PERFORM public._materialize_single_occurrence(v_occ.id);
      v_materialized := v_materialized + 1;
    EXCEPTION WHEN OTHERS THEN
      -- En enkelt fejl må ikke stoppe hele cron-jobbet; idempotens-constraints
      -- sikrer at retry blot springer over det der allerede er gjort.
      RAISE WARNING 'materialize_upcoming_occurrences: occurrence % failed: %', v_occ.id, SQLERRM;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'window_days', _window_days,
    'businesses_scanned', v_business_count,
    'occurrences_inserted', v_inserted_occ,
    'occurrences_materialized', v_materialized,
    'horizon', v_horizon
  );
END;
$$;

REVOKE ALL ON FUNCTION public.materialize_upcoming_occurrences(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.materialize_upcoming_occurrences(int) TO service_role;
COMMENT ON FUNCTION public.materialize_upcoming_occurrences(int) IS
  'Fase 5: Hybrid materialisering. Pre-materialiserer agreement_occurrences + route_stops for et rullende vindue (default 30 dage). Kaldes af cron-jobbet materialize-upcoming-occurrences-daily.';
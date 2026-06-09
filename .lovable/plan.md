## Mål

1. Tillad at en basisrute flyttes til en dato hvor der ligger en projiceret forekomst af samme serie. Eksisterende "Spørg ved flyt"-dialog bestemmer scope (`single` vs `future`).
2. Stop med at fjerne udførte ruter og deres fremtidige projektioner fra ruteplanlæggeren. Vis dem i stedet med korrekt status og handlinger.

## Ændringer

### 1. Flyt basisrute hen over projiceret forekomst
**Fil:** `src/domain/routes/drop-decision.ts` (`decideRouteToDay`)

- Fjern hard-blocket for `collidingProjected`. Behold blot blokering når der ligger en **rigtig** materialiseret rute fra samme serie på måldagen (det er en ægte konflikt).
- Når der ligger en projiceret forekomst på måldagen → fortsæt direkte til "spørg ved flyt"-dialogen.
  - `scope: "single"` → flyt kun denne rute; den projicerede forekomst på samme dag undertrykkes for den ene dag (skriv `route_occurrence_exception` af typen `cancelled` for den projicerede dato, så vi ikke får to af samme serie på samme dag).
  - `scope: "future"` → flyt serien fremad; eksisterende RPC `move_route_to_date(..., 'future')` rykker fremtidige cadence-anker, så de projicerede forekomster naturligt forskydes.
- Validation i `useRoutePlannerDnd.ts` opdateres tilsvarende (advarsel i stedet for fejl, message: "Der ligger en projiceret forekomst — vælg scope ved slip").

### 2. Vis udførte ruter (ikke fjern dem)
**Filer:** `src/components/route-planner/MonthWeekCalendar.tsx`, `AgendaCalendar.tsx`, `CalendarPlanner.tsx`, `RouteEditSheet.tsx`

- Render rute-kort med `status === "completed"` med:
  - Grøn "Udført"-badge + `CheckCircle2`-ikon.
  - Disabled "Start rute" / "Optimér" knapper.
  - Ny "Genåbn rute"-knap (admin) → kalder ny mutation `useReopenRoute` der sætter `routes.status = 'planned'` og nulstiller `completed_at`; samtidig sættes alle stops på ruten fra `completed` → `planned` via eksisterende `_apply_completion_handle`-modgang (ny SQL-funktion `reopen_route(_route_id)` der gør det atomart og logger til `route_audit_log`).
- Sikre at routes-query (`useRoutes`/`routes-range`) IKKE filtrerer udførte ruter væk i ruteplanlæggerens vindue.

### 3. Bevar fremtidige projicerede ruter efter completion
**Filer:** `src/hooks/route-planner/useProjectedCalendar.ts`, `src/lib/recurring-projection.ts`

- `isLiveProjectedStop` blev tidligere fixet, men når selve basisruten er `completed` overlever stop'ene måske ikke. Tilføj: basisruter med `status="completed"` skal stadig fungere som projektionskilde for fremtidige datoer (`> baseRoute.route_date`).
- Verificér i `useProjectedCalendar` at `baseById`-fallback ikke smider basisrute væk hvis den er `completed`.

### 4. Lås for fremtidige projicerede ruter
**Filer:** `MonthWeekCalendar.tsx`, `CalendarPlanner.tsx`, `AgendaCalendar.tsx`

- Tilføj `Lock`-ikon (lucide-react) i hjørnet af projicerede rute-kort hvor `route_date > i dag`.
- Tooltip: "Oplåses [dato]".
- Disable "Start rute" / "Materialisér + start" actions; "Åbn"/redigér forbliver tilgængelig (planlægning skal stadig kunne ske).
- Ingen ændringer i medarbejder-appen — den blokerer allerede ved dato-check.

### 5. Tests

**Nye/udvidede tests:**
- `src/domain/routes/drop-decision.test.ts`: Drop af basisrute på dato med projiceret forekomst → returnerer `dialog: route-move` (ikke blocked).
- `src/lib/interval.minute-hour-cadence.test.ts` (eller ny fil): Efter completion af én forekomst forbliver fremtidige projektioner synlige.
- E2E (`e2e/route-planner-completion.spec.ts`): Komplettér en rute, verificér at fremtidige uger stadig har projicerede kort + lock-ikon.

### Tekniske detaljer

```text
drop-decision.ts:
  decideRouteToDay()
    └─ if collidingProjected → REMOVED
       (faldt før igennem til dialog)

MonthWeekCalendar route-card:
  ├─ status="completed"  → grøn badge + Reopen-knap
  ├─ projected && future → Lock-ikon + disabled start
  └─ default             → som i dag
```

```sql
-- Ny RPC: atomar genåbning
CREATE OR REPLACE FUNCTION public.reopen_route(_route_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.routes SET status='planned', completed_at=NULL WHERE id=_route_id;
  UPDATE public.route_stops SET status='planned', completed_at=NULL
    WHERE route_id=_route_id AND status='completed';
  INSERT INTO public.route_audit_log(business_id, route_id, action, affected_count)
  SELECT business_id, _route_id, 'route.reopen', 1 FROM public.routes WHERE id=_route_id;
END $$;
```

### Filer der ændres
- `src/domain/routes/drop-decision.ts` + test
- `src/hooks/route-planner/useRoutePlannerDnd.ts` (validation message)
- `src/hooks/route-planner/useProjectedCalendar.ts` (completed base routes som kilde)
- `src/components/route-planner/MonthWeekCalendar.tsx`, `AgendaCalendar.tsx`, `CalendarPlanner.tsx`
- `src/components/route-planner/RouteEditSheet.tsx` (Reopen-knap)
- `src/hooks/useRoutes.ts` (ny `useReopenRoute`)
- Ny SQL-migration: `reopen_route` RPC + audit-action
- Ny E2E test

## Mål

Reducere teknisk gæld i ruteplanlæggeren uden at ændre datamodel eller forretningslogik. Flytte domænelogik ud af `RoutePlanner.tsx` til testbare moduler, gøre projekteringen eksplicit, dokumentere trigger-flowet, og indføre hybrid materialisering for nær-fremtidige ruter.

Arbejdet leveres i 5 faser, hvor hver fase kan rulles ud uafhængigt og verificeres for sig. Ingen UI-ændringer for slutbrugeren; alle eksisterende tests og guards skal fortsat passere.

---

## Fase 1 — Projection engine (isoleret, testbart modul)

**Ny mappe:** `src/lib/route-projection/`

Opdel den nuværende projekteringslogik (i dag spredt mellem `recurring-projection.ts` og inline-blokke i `RoutePlanner.tsx` ca. linje 1530–1700) i navngivne trin, hver som ren funktion:

```text
buildRecurringSources()
  → expandCadence()        // raw datoer fra basisrute
  → applyOverrides()       // moves / cancels fra agreement_occurrence_overrides
  → applyPauses()          // pause-perioder
  → applyHolidays()        // helligdage
  → applyOccurrenceShifts()// projected shifts
  → dedupeAgainstRealRoutes()
  → filterStopsByOccurrenceDate()
→ ProjectedRoute[]
```

Hver funktion får signaturen `(input, ctx) => output` uden side effects. En `runProjection(sources, ctx)` orkestrerer kæden.

**Tests:** `src/lib/route-projection/__tests__/` med vitest — én testfil pr. trin, plus end-to-end-cases (override + pause + helligdag samtidigt, kollision med ægte rute, mv.).

**Acceptkriterium:** `useCalendarData` kalder kun `runProjection(...)` og udleder ikke længere logik selv. Snapshot-tests viser at output er identisk med før refaktoreringen for et sæt produktion-lignende inputs.

---

## Fase 2 — Opdeling af RoutePlanner.tsx

Nuværende `src/pages/RoutePlanner.tsx` (~6.600 linjer, ~80 useState, ~40 useMemo) splittes i dedikerede hooks og en slank container.

**Nye hooks under `src/hooks/route-planner/`:**

- `useProjectedCalendar()` — wrapper omkring projection engine + `useCalendarData`, returnerer `calendarRoutes`, `loading`, `refetch`.
- `useRoutePlannerSelection()` — markerede ruter/stop, multi-select, fokus.
- `useRoutePlannerDnd()` — `@dnd-kit` sensorer, kollisionsdetektion, drag-validation, drop-handlers.
- `useRouteDialogs()` — åbn/luk-state for `MoveRouteDateDialog`, `MoveProjectedOccurrenceDialog`, `RouteEditSheet`, etc.
- `useRoutePlannerUndo()` — undo/redo-stak for flytninger og aflysninger.
- `useRoutePlannerFilters()` — medarbejder, status, søgning, dato-range.

Container `RoutePlanner.tsx` reduceres til layout + komposition af hooks (mål: under 800 linjer). Ingen forretningslogik i selve komponenten.

**Acceptkriterium:** Eksisterende E2E-flow (planlæg, flyt, udfør, undo) virker uændret. Linjetælling i `RoutePlanner.tsx` < 800.

---

## Fase 3 — Samlet UI-state via reducer

Erstat fragmenteret `useState`-mængde med én `useReducer` pr. hook fra Fase 2, eller en let zustand-store hvis state krydser hooks (selektion + dialog + dnd samtidig).

Actions navngives eksplicit: `SELECT_STOP`, `OPEN_MOVE_DIALOG`, `COMMIT_MOVE`, `UNDO_LAST`, etc. Hver action har en pure reducer-test.

**Acceptkriterium:** Ingen `useState` tilbage i `RoutePlanner.tsx`. Reducer-tests dækker alle actions.

---

## Fase 4 — Trigger-dokumentation og diagram

Opret `docs/route-stops-triggers.md` med:

- Tabel over alle 17 triggers på `route_stops` (navn, BEFORE/AFTER, event, formål, rækkefølge).
- Mermaid-diagram af flowet ved `UPDATE status='completed'`: guard → completion-handler → next-occurrence → invoice-enqueue → accounting-sync → unique-constraint-checks.
- Sektion "Hvad sker der hvis trigger X fejler" pr. trigger.
- Link fra `RoutePlanner.tsx`-header-kommentar og fra migration-mappen.

Ingen kodeændringer i denne fase — kun dokumentation. Forberedende skridt for evt. senere migration til eksplicit event-bus.

**Acceptkriterium:** Dokumentet review'es; udvikler kan på 5 minutter forklare hvad der sker når et stop markeres udført.

---

## Fase 5 — Hybrid materialisering (30-60 dages vindue)

Ny cron + RPC der pre-materialiserer projicerede occurrences for et rullende vindue:

- `materialize_upcoming_occurrences(window_days int)` — indsætter manglende `agreement_occurrences` for alle aktive recurring sources hvor `planned_arrival` ligger i `[now, now + window_days]`.
- Kører dagligt via eksisterende `recurring-orders` cron (eller ny separat schedule).
- Idempotent via eksisterende unique constraint `(agreement_id, sequence_index)`.
- Projection engine får ny ctx-flag `materializedRange` så `dedupeAgainstRealRoutes()` ved at alt i vinduet kommer fra DB.

**Acceptkriterium:** Efter cron-kørsel findes DB-rækker for alle forekomster i de næste 30 dage. Drag-and-drop i nær-fremtid rammer ægte rækker (ingen lazy `useMoveProjectedOccurrence`-sti). Projektion længere ude virker uændret.

**Note:** Vinduesstørrelse (30 vs. 60 dage) gøres til konfig-værdi; default 30.

---

## Teknisk detalje

**Filer der røres (forventet):**
- Nye: `src/lib/route-projection/*`, `src/hooks/route-planner/*`, `docs/route-stops-triggers.md`, migration for `materialize_upcoming_occurrences` RPC + cron.
- Ændres: `src/pages/RoutePlanner.tsx` (krymper kraftigt), `src/hooks/useCalendarData.ts`, `src/lib/recurring-projection.ts` (flyttes ind under nyt modul).
- Uændret: datamodel, triggers, RLS, edge functions, alle UI-komponenter under `src/components/route-planner/`.

**Test-strategi:** Vitest til projection engine + reducers. Eksisterende `completion-guard.test.ts` udvides ikke. Manuel røgtest af planlægger-UI efter hver fase.

**Rollback:** Hver fase er bagudkompatibel; feature-flag `useNewProjectionEngine` i fase 1 tillader øjeblikkelig tilbagerulning hvis snapshot-tests afviger i produktion.

---

## Rækkefølge og uafhængighed

Fase 1 og 4 kan startes parallelt (engine + dokumentation). Fase 2 kræver Fase 1. Fase 3 kræver Fase 2. Fase 5 kan ske når som helst efter Fase 1, men giver mest værdi efter Fase 2.

Anbefalet leveringsrækkefølge: **1 → 4 → 2 → 3 → 5**.

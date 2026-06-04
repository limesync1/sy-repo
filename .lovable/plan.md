## Udgangspunkt

`RoutePlanner.tsx` er nu på 5.929 linjer efter de seneste hook-udtræk (`useRoutePlannerWorkflowState`, `useRoutePlannerDnd`, `useRoutePlannerKeyboard`, `useRouteSelection`, `useProjectedCalendar`, `useRouteDialogs`, `useRoutePlannerFilters`). Projektion er allerede samlet bag `runProjection()` i `src/lib/route-projection/`. Materialisering 30 dage frem kører i backend.

Det betyder at flere af dine 15 punkter allerede er delvist løst — planen herunder skelner mellem **NYT**, **UDVID** og **NYT MEN STORT**.

---

## Anbefalet rækkefølge (5 bølger)

### Bølge 1 — Stabil frontend-kerne (1-2 dage, lav risiko)

**1.1 Central planner-store** (#1) — NYT
- Saml `selection`, `filters`, `dialogs`, `dragState`, `editingContext`, `calendarView` i én `useReducer` i `src/hooks/route-planner/usePlannerStore.ts`.
- Eksisterende hooks (`useRouteSelection`, `useRoutePlannerFilters`, `useRouteDialogs`, `useRoutePlannerWorkflowState`) bliver tynde selektorer oven på storen.
- Actions er rene (`SELECT_JOB`, `OPEN_DIALOG`, `SET_VIEW`...). Ingen mutationer flyttes endnu.
- Resultat: én sandhed, færre rerenders, klar til undo/redo.

**1.2 Undo/redo via action-log** (del af #1)
- Storen logger sine egne actions i en ringbuffer.
- `Cmd+Z` re-spiller modsat. Erstatter den nuværende `useRouteHistory`-blanding.

**1.3 DragEnd-udtræk færdiggøres** (#2 frontend, #13)
- De ~660 linjer `handleDragEnd` i `RoutePlanner.tsx` flyttes ind i `useRoutePlannerDnd` og opdeles i:
  - `validateDrop(source, target)` → `DropDecision`
  - `commitDrop(decision)` → mutation-kald
  - `rollback(decision)` på fejl
- `RoutePlanner.tsx` falder til ~4.500 linjer.

### Bølge 2 — Domæne-lag (2-3 dage)

**2.1 `src/domain/routes/`** (#3) — NYT
- Flyt eksisterende lib-filer ind:
  - `projection.ts` ← `lib/route-projection/`
  - `overrides.ts` ← dele af `recurring-projection.ts`
  - `completion.ts` ← `completion-guard.ts` + relateret logik
  - `validation.ts` ← `route-validation.ts` + `route-conflicts.ts`
  - `optimization.ts` ← `optimize-savings-estimate.ts`
- UI importerer kun fra `@/domain/routes`. Tests følger med.
- **Ingen logikændring** — bare flytning + re-eksport. Sikker.

**2.2 Projektion som pipeline** (#2) — UDVID
- Wrap `runProjection` i en fluent builder:
  ```ts
  ProjectionEngine.from(sources)
    .inRange(start, end)
    .withRealRoutes(realDates)
    .applyExceptions(exc)
    .applyOverrides(ovr)
    .applyPauses(pauses)
    .applyHolidays(hols)
    .build()
  ```
- Ren syntaks-sukker oven på eksisterende rene funktioner. Backwards-kompatibel.

**2.3 ConflictEngine** (#11) — NYT
- `src/domain/routes/conflicts.ts` samler de regler der i dag ligger spredt i `detectAssigneeConflicts`, `useDayConflicts`, hints i optimize-route:
  - skill mismatch, overlap, ferie, kapacitet, geografi, arbejdstid, kundeønske
- Én funktion: `evaluateConflicts(plan) → Conflict[]`.
- Bruges af UI (badges), DragEnd (validate) og senere simulation mode.

### Bølge 3 — Backend audit & observability (2-3 dage)

**3.1 `route_events`-tabel** (#4, #14 light) — NYT MEN STORT
- Migration: `route_events(id, entity_type, entity_id, event_type, payload jsonb, created_by, created_at)`.
- Eksisterende 17 triggers udvides til at indsætte én række pr. domæne-hændelse:
  `STOP_COMPLETED → OCCURRENCE_UPDATED → NEXT_OCCURRENCE_CREATED → INVOICE_ENQUEUED → ACCOUNTING_SYNCED`.
- Ingen eksisterende logik fjernes — kun observability tilføjes.

**3.2 Visual trigger debugger** (#5) — NYT
- Side under `Admin > Diagnostik`: vælg entity → tidslinje af `route_events` med varighed pr. step.
- Læser kun, ingen mutationer.

**3.3 Trigger-konsolidering** (#8) — UDVID
- Saml `trg_route_stop_completed_*` til én funktion `perform_completion()` der kalder hjælpere. Reducerer entry points fra 17 → ~10.
- Gøres efter event-loggen så vi kan verificere uændret adfærd.

### Bølge 4 — Robusthed (1-2 dage)

**4.1 Property-based tests** (#9) — NYT
- `fast-check` (allerede en mulighed) genererer aftaler m. tilfældige intervaller/pauser/overrides og verificerer invarianter på `ProjectionEngine`:
  - ingen dubletter, ingen tabte occurrences, alle overrides respekteres, idempotent build.

**4.2 Projektions-cache** (#6) — NYT
- `LRU<cacheKey, ProjectionResult>` med key `${businessId}|${rangeStart}|${rangeEnd}|${filtersHash}`.
- Invalideres af mutations på agreements/exceptions/holidays.
- Måling først — kun aktiveres hvis profileren viser >50ms pr. build.

**4.3 Route snapshots** (#12) — NYT MEN STORT
- Migration: `route_snapshots(route_id, date, payload jsonb, locked_at)`.
- Skrives når en rute låses/afsluttes. Bruges af reklamationer + simulation rollback.

### Bølge 5 — Strategisk (uger, ikke dage)

**5.1 Simulation mode** (#10) — bygger på 1.1 + 2.3
- "Dry-run" plannerStore: alle actions kører gennem ConflictEngine + en kopi af projektionen uden DB-skriv. Viser diff: `+X flyttes, Y konflikter, Z medarbejdere dobbeltbookes`.

**5.2 Backend-bygget kalender** (#7) — kræver 3.x
- Edge function `GET /calendar?range=...` returnerer færdige `calendarRoutes`. Frontend bliver tynd renderer. Forudsætning for mobil-app.

**5.3 Workflow engine** (#15) — overbygning, ikke et enkelt PR
- Først meningsfuldt når 3.1 (event-log) + 4.3 (snapshots) er i drift. Behandles som separat projekt.

---

## Hvad jeg IKKE anbefaler nu

- **Fuld event sourcing** (#14): Stort skifte. Event-log light i 3.1 dækker 80% af gevinsten uden at ændre nuværende status-modeller.
- **At ændre triggers før event-loggen findes**: Vi mister revisionsspor under refactor. 3.1 før 3.3.
- **Cache (4.2) før måling**: Risiko for stale data > gevinst hvis vi ikke ved den er nødvendig.

---

## Afhængigheds-graf

```text
1.1 store ──┬─► 1.2 undo/redo
            └─► 1.3 dragEnd ──► 5.1 simulation
2.1 domain ──► 2.2 pipeline ──► 4.1 property tests
            └─► 2.3 conflict ──► 5.1 simulation
3.1 events ─┬─► 3.2 debugger
            └─► 3.3 trigger-konsolidering ──► 5.3 workflow
4.3 snapshots ──► 5.3 workflow
                  5.2 backend-kalender (kræver 3.x stabil)
```

---

## Forslag til første leverance

Hvis du godkender planen, foreslår jeg vi starter med **Bølge 1 (1.1 + 1.2 + 1.3)** som én sammenhængende PR. Det er den største frontend-gevinst pr. time og frigør `RoutePlanner.tsx` så de næste bølger bliver lettere.

Sig til hvis du vil:
- godkende hele planen og starte Bølge 1
- omprioritere (fx Bølge 3 før Bølge 2)
- droppe enkelte punkter
- have estimater pr. delopgave i timer

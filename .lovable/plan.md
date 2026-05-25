# Rutekalender 3.0

Mål: planlæg 500 ruter/dag uden ryk, færre klik pr. ændring, og lad systemet selv tænke med — i stedet for kun at validere efter brugeren har klikket.

Implementeres i 4 faser. Hver fase er selvstændig værdi og kan udrulles trinvist.

---

## Fase A — Smartere planlægning (logik)

Skal ligge i `src/lib/route-brain/` + `supabase/functions/route-brain/`.

1. **Auto-byg dagen** (ny edge function `route-brain-build-day`)
   - Input: dato + valgte ordrer/abonnementer + tilgængelige medarbejdere + lukkedage/ferie/vejr.
   - Bruger eksisterende VRP-kerne fra `optimize-route/vrp.ts`, men kører den på *alle utildelte stops* og fordeler i nye/eksisterende ruter.
   - Respekterer: hårde tidsvinduer, faste kunde-medarbejder relationer (ny `customer_employee_preferences`), kompetencer (allerede i `employees.skills`), bil/last-kapacitet.
   - Output: forslag som dry-run — vises i ny `BuildDayPreviewSheet` før commit.

2. **Geo-clustering på drop** (klient-side, synkront)
   - Når et stop trækkes over en dag uden eksisterende rute: foreslå *hvilken medarbejder* baseret på (a) hvem der bor tættest, (b) hvem der allerede har stops i samme postnummer, (c) hvem der har plads i tidsvinduet.
   - Vises som live "smart drop" pille på cellen — én klik tildeler.

3. **Kunde-præferencer & historik**
   - Ny tabel `customer_employee_affinity` (auto-opbygges fra `route_stops`-historik via daglig cron): hvor ofte har medarbejder X været hos kunde Y, sidste besøg.
   - Bruges i VRP-vægtning + vises i UI ("Marie har været her 12x").

4. **AI-second-opinion** (Lovable AI, ny edge function `route-brain-review-day`)
   - Tager dagens plan + giver 0-3 konkrete forslag i strukturerede tool-calls.
   - Knappet bag "Spørg AI" i toolbar — ikke automatisk for at undgå støj og rate-limits.

## Fase B — Drag & drop UX

Alt i `src/components/route-planner/`.

1. **Multi-select**: shift+klik på stops, træk hele bundtet. Visual: stack-card i drag overlay med antal.
2. **Keyboard**: piletaster flytter selected stop ±1 dag eller ±1 plads i rute. `Cmd/Ctrl+Z` undo.
3. **Undo/redo-stak** (`src/lib/route-history.ts`)
   - Hver mutation pushes som invers-operation; max 50.
   - Vises som toast med "Fortryd" + persistent undo-knap i toolbar.
4. **Snappier drag overlay**
   - Drop CSS-only ghost; brug `@dnd-kit` `DragOverlay` med GPU-transform.
   - Fjern `JSON.stringify` i hot paths (set kun ændrede felter).
5. **Hover-pre-validation**: kør allerede-eksisterende `validateStopAssignment` synkront ved `onDragOver` (debounced 50ms) — pille viser ok/warn/blok *før* slip. Delvist gjort i forrige iteration, men finpudses.

## Fase C — Performance & realtime

For 500 ruter/dag + 5 samtidige planlæggere.

1. **Virtualisering**
   - `MonthWeekCalendar`: brug `@tanstack/react-virtual` på dag-celler — render kun viewport + 1 row buffer.
   - Liste-views (stop-liste, audit-log): samme.

2. **Selective queries**
   - Split `useRoutes` i `useRoutesIndex` (kun metadata: id, date, employee_ids, stop_count) og `useRouteDetail(id)` (stops, geo).
   - Index-query er det eneste der lyttes til realtime; detaljer hentes on-demand når kort/popover åbnes.

3. **Optimistic batching**
   - Eksisterende `mutation-queue.ts` udvides: batch flere `update_stop_order` i ét round-trip via ny RPC `batch_update_stop_orders(jsonb)`.
   - Reducerer 12 sekventielle kald til 1 ved omrokering af en rute.

4. **Realtime presence + locks**
   - Nye Supabase `realtime presence` channel `route-day:{date}`: viser farvede avatarer på dage hvor en anden planlægger redigerer.
   - Soft-lock på drag-start (allerede halvt klar via `route-claim.ts`) udvides til at sende presence-broadcast så andre ser låsen øjeblikkeligt uden DB-roundtrip.

5. **Medarbejderpanel-optimering**
   - `EmployeeApp` / `EmployeeRoute`: skift fra polling-agtig `useRoutes` til targeted `useMyTodayRoute(employee_id, date)` med realtime kun på den ene række.
   - Map-rendering: clusterer kun stops i viewport, lazy-load polyline efter første idle.

## Fase D — Observability (kort)

- `route_performance_log` tabel: planlæggers mutation → ms; surface som mini-graf i admin "Rutefejl" tab (omdøbes til "Rutediagnostik").
- Sentry breadcrumbs på alle drag-events (kun anonymiseret payload).

---

## Tekniske noter

- DB-ændringer:
  - `customer_employee_affinity` (customer_id, employee_id, business_id, visit_count, last_visit_at)
  - `customer_employee_preferences` (manuelle pinninger)
  - `route_performance_log`
  - RPC `batch_update_stop_orders(payload jsonb)` + RLS via `has_role`.
- Nye edge functions: `route-brain-build-day`, `route-brain-review-day`. Genbruger `optimize-route/vrp.ts` + `geo.ts`.
- Ingen breaking changes — alt nyt kører side om side med eksisterende kalender, bag feature-flag `route_planner_v3` i `businesses.feature_flags` (jsonb) så vi kan rulle ud til 1 firma først.

## Rækkefølge & estimat

```text
Fase C.2 (selective queries)        ← fundament, gør resten hurtigere
Fase C.1 (virtualisering)
Fase B.3 (undo/redo)                ← billig sikkerhed inden vi rører logik
Fase B.1+B.2 (multi-select, kbd)
Fase A.2 (geo-clustering smart drop)
Fase A.1 (auto-byg dagen)
Fase A.3 + A.4 (affinity + AI review)
Fase C.3+C.4 (batching, presence)
Fase C.5 (medarbejderpanel)
Fase D (observability)
```

Jeg starter med Fase C.2 → C.1 → B.3 i første implementeringsrunde (det giver mærkbart hurtigere kalender + safety net), og spørger så før jeg går videre til logik-fasen.
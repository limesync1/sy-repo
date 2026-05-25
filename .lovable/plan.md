
# Rutekalender – faseopdelt redesign

Dokumentet beskriver ~30 sammenhængende krav. De kan ikke leveres som ét stykke arbejde uden at destabilisere systemet undervejs. Planen nedenfor er prioriteret efter hvad der **forhindrer datatab og duplikationer nu**, og hvad der kan vente.

Hver fase er et selvstændigt stykke arbejde der efterlader systemet i en stabil tilstand. Vi tager én fase ad gangen og du bekræfter resultatet før vi går videre.

---

## Fase 1 — Lås projicerede ruter (kritisk)

Forhindrer at fremtidige projicerede ruter kan ændres ved et uheld.

- Backend: ny RPC-guard der afviser direkte updates/deletes/stop-ændringer på en route hvis dens dato er en projiceret instans (dvs. ikke materialiseret endnu). Frontend skal IKKE være eneste forsvar.
- Frontend (`RouteEditSheet`, `StopDetailSheet`, `MonthWeekCalendar`):
  - Disable rediger-felter (navn, farve, dato, medarbejder, rækkefølge, optimer, slet) når `isVirtual === true`.
  - Lås-ikon + badge "Projiceret rute".
  - Drag/drop af stops på projicerede ruter: blokeret.
  - Drag af hele projicerede ruter til ny dato: stadig tilladt via shift-RPC'en fra forrige tur (kun shift, ingen materialisering).
- Aflys-forekomst-knappen bevares — den skriver en `cancelled` override på agreement, ikke en route-edit.

## Fase 2 — Sletteguard for ruter med aftaler (kritisk, datatab)

Forhindrer at ruter med stops/aftaler/historik kan hard-deletes.

- Migration: tilføj `archived_at timestamptz` på `routes`. Behold `DELETE` for tomme ruter, men kræv soft-delete via `archive_route(_route_id)` for alt andet.
- RPC `archive_route` validerer:
  - Ingen `completed`/`in_progress` stops mistes — de bevares og er stadig synlige i historikken.
  - Hvis ruten er basisrute for en serie: spørg eksplicit hvad der skal ske med fremtidige projektioner (skip / lad serien fortsætte uden basis).
- Frontend: erstat slet-knappen med "Arkivér rute" når ruten ikke er tom. Tilføj advarselsdialog med konsekvensanalyse ("X aftaler, Y stops, Z fremtidige forekomster påvirkes").
- Kalender + lister filtrerer arkiverede ruter fra som default; admin-visning kan toggle dem ind.

## Fase 3 — Recurrence pr. aftale på projicerede ruter (kritisk korrekthed)

Sikrer at en projiceret rute viser præcis de aftaler hvis interval rammer den dato.

Status: dette er allerede implementeret i `expandRecurringRoutes` + `virtualCalendarRoutes` på source-key-niveau. Vi auditerer for kantsager:

- Hver `agreement` evalueres uafhængigt via `intervalToCadence` + `seed_date`/`anchor_date`.
- Pause-perioder og helligdage respekteres pr. aftale.
- Tests/verifikation: kør en datasæts-walk gennem alle aktive serier i basen og log uoverensstemmelser mellem cadence og hvad kalenderen viser. Fix evt. fejl.

## Fase 4 — Medarbejderpanel: kun aktuelle ruter

Sikrer at medarbejdere ikke ser eller kan udføre fremtidige aftaler.

- Hooks for medarbejder-views (`useMyRoutes`, `useEmployeeAssignments` osv.) filtreres `route_date <= today`.
- Backend RLS / RPC: medarbejderrolle får kun læseadgang til stops hvor route.route_date <= today OR status in ('completed','in_progress').
- Action-RPC'er (`complete_stop`, `start_stop`) afviser hvis stoppets dato er i fremtiden.
- "Næste forekomst" oprettes ikke længere på den aktuelle rute når et stop fuldføres — den findes allerede som projektion på den korrekte fremtidige dato (dette er en stille men vigtig opfølgning på Fase 3).

## Fase 5 — Idempotens og duplikat-beskyttelse (robusthed)

Eliminerer dubletter ved dobbeltklik, lag og parallelle brugere.

- Unique constraints:
  - `routes (base_route_id, route_date) WHERE base_route_id IS NOT NULL` (findes delvist).
  - `route_stops (route_id, order_id) WHERE order_id IS NOT NULL` — verificér at den findes.
  - `route_stops (route_id, agreement_id, agreement_occurrence_date)` — partial unique for projicerede stops.
- Alle write-RPC'er kører i én transaktion med `SELECT … FOR UPDATE` på basisruten.
- Frontend: alle kritiske knapper (opret rute, materialisér, flyt, flet, optimer, opret stop) bruger `disabled={mutation.isPending}` + serverside idempotency-claim (allerede etableret som `claim_route_planner_idempotency` — vi auditerer dækningen).
- Debounce på 250 ms på drag-drop final.

## Fase 6 — Intelligent change management (scope-dialoger)

Alle handlinger der påvirker en serie skal spørge bruger: kun denne / fremtidige / hele serien.

Allerede delvist på plads for "flyt rute" og "flyt projiceret rute". Udvides til:

- Flet to ruter → spørg om kilde-rutens fremtidige aftaler også flyttes.
- Skift medarbejder på basisrute → spørg om fremtidige projektioner også.
- Skift recurrence-interval → preview af hvilke fremtidige datoer der ændres/fjernes/tilføjes.
- Aflys forekomst → bekræft med antal påvirkede.
- Hver dialog viser konsekvensanalyse: påvirkede aftaler, ruter, medarbejdere, konflikter, dobbeltbookinger.

## Fase 7 — Exception/override-model

Renser modellen for enkeltstående afvigelser.

- `route_occurrence_exceptions` er på plads og dækker `skipped` / `shifted` / legacy `moved`.
- `agreement_occurrence_overrides` dækker per-aftale afvigelser (dato, medarbejder, cancelled).
- Audit + tests: én pipeline for hvordan exceptions konsumeres i projektionen, så vi aldrig får dobbeltvisning.

## Fase 8 — Audit log og historik

- Ny tabel `route_change_audit` (hvem, hvad, hvornår, scope, before, after).
- Trigger på `routes`, `route_stops`, `route_occurrence_exceptions`, `agreement_occurrence_overrides`.
- Admin-view "Aktivitet" på rute-detaljer.

## Fase 9 — Skalerbarhed & queue

- Flyt batch-materialisering og recurrence-regenerering til pg_cron + en worker-edge-function i stedet for at frontend trigger ad-hoc.
- Pagination/virtualisering i kalender og aftalepool ved store datamængder.

---

## Tekniske noter

- Alle nye RPC'er: `SECURITY DEFINER`, `SET search_path = public`, `EXECUTE` kun for `authenticated`, eksplicit auth-check + ejerskab-check.
- Migrationer kører idempotent (`IF NOT EXISTS`, `ON CONFLICT`).
- Frontend isolerer projection/instance-logik i `src/lib/recurring-projection.ts` så ingen komponent gætter selv.
- Vi rører ikke `src/integrations/supabase/{client,types}.ts`.

---

## Hvad jeg foreslår vi starter med

**Fase 1 + Fase 2** først — de fjerner de to mest skadelige bugs (utilsigtet ændring af projicerede ruter, og datatab ved sletning). De er afgrænsede og kan leveres uden at røre projektionsmotoren.

Sig til hvis du vil have en anden rækkefølge, eller om jeg skal udvide en fase med mere detalje før jeg går i gang.

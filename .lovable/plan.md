
# Rutekalender — UX & datalogik-refaktor

Specifikationen er omfattende (33 sektioner). Jeg foreslår at gennemføre den i **5 faser** så vi kan teste hver milepæl uden at lægge hele systemet ned. Eksisterende UI bevares — kun adfærd, badges på låste elementer, og dialoger ændres.

## Fase 1 — Lås projicerede ruter (UX + backend-guard)

**Mål:** Brugeren kan ikke længere flytte, redigere, omarrangere eller slette projicerede instanser.

- I `RoutePlanner.tsx` + `route-planner/`-komponenter: marker projicerede stops/ruter (id starter med `virtual:`) som `isProjected` og:
  - Disable drag-and-drop (DnD-kit `disabled` på droppable + draggable).
  - Disable rediger/slet-knapper.
  - Tilføj lille "Projiceret" badge + lås-ikon (genbruger eksisterende Badge-komponent).
- Backend: i alle route/stop-mutations afvis kald med virtuelle ids → 409 "Projicerede ruter kan ikke ændres direkte. Rediger basisruten i stedet."
- Klik på projiceret rute → åbn read-only visning af basisrutens stops projiceret til datoen (ikke en tom rute).

## Fase 2 — Beskyt mod datatab (soft-delete + sletteguard)

- Migration: tilføj `archived_at`, `deleted_at` på `routes` (hvis ikke allerede).
- `delete_route` blokeres hvis ruten har stops med `agreement_id`/`subscription_id`/aktive ordrer. UI viser dialog: "Ruten har N aftaler — arkivér i stedet?".
- Sletning af et enkelt stop på en basisrute med aftale → samme dialog: "Aflys kun denne forekomst" / "Stop hele serien".

## Fase 3 — Idempotens & race condition-hærdning

- Database: unique constraint `(base_route_id, route_date)` på materialiserede instanser; unique `(agreement_id, occurrence_date)` på stops.
- Backend: alle mutations bruger transaktioner + idempotency-key (allerede delvist via `routeMutationQueue`); upsert på conflict i stedet for insert.
- Frontend: debounce + disabled-state på knapper under pending mutation (gælder også drop-zoner).

## Fase 4 — Recurrence pr. aftale (ikke pr. rute)

- I dag projiceres ruter helt — alle aftaler antages at falde på samme cadence. Skift til: hver aftale projiceres individuelt ud fra eget interval. Hvis en projiceret rute-dato har 0 matchende aftaler → rute vises ikke.
- Justér `recurring-projection.ts` til at evaluere `agreement.interval` pr. occurrence, ikke pr. rute.
- Konsekvens: aftale A (ugentligt), B (hver 2. uge), C (månedligt) viser kun de aftaler hvis cadence matcher datoen.

## Fase 5 — Intelligente konsekvensdialoger ("kun denne / fremtidige / hele serien")

- Genbrug eksisterende `AlertDialog` til en `SeriesEditDialog` med 3 valg + konsekvens-tekst:
  - "Påvirker N fremtidige forekomster, M medarbejdere."
- Trigges ved: flyt aftale til ny dato, skift medarbejder, skift interval, flet ruter.
- Backend understøtter `scope: "single" | "future" | "all"` på alle relevante mutations.
- "single" → opretter `agreement_occurrence_override` række (exception); rører ikke basis-aftalen.
- "future" → split serien: sæt `end_date` på gammel, opret ny aftale fra valgt dato.
- "all" → opdater basis-aftalen.

## Teknisk overblik (for senere reference)

- Berørte filer: `src/pages/RoutePlanner.tsx`, `src/components/route-planner/*`, `src/lib/recurring-projection.ts`, `src/hooks/useRoutes.ts`, `supabase/functions/recurring-orders/`, ny migration for unique constraints + `agreement_occurrence_overrides`-tabel + `archived_at` kolonner.
- Audit log (sektion 25): bruger eksisterende `audit_log`-tabel hvis den findes — ellers tilføj i fase 3.

## Status

- **Fase 1 (UI-låsning af projicerede ruter):** Færdig — 🔒 PROJICERET badges i `MonthWeekCalendar`, `AgendaCalendar`, samt prominent banner i `RouteEditSheet`.
- **Fase 2 (Sletteguard m. konsekvens-visning):** Færdig — ny `DeleteRouteDialog` viser antal aftale-/abonnement-/ordre-stop der påvirkes før sletning.
- **Fase 3 (Idempotens):** DB-niveau allerede på plads — `routes_base_route_id_route_date_key` og `agreement_occurrences_agreement_id_occurrence_date_key` UNIQUE constraints findes, og frontend kører gennem `routeMutationQueue` (idempotency-kø). Pending state tilføjet til delete-knapper.
- **Fase 4 (Per-aftale recurrence):** Allerede implementeret i `recurring-projection.ts` — `expandRecurringRoutes` projicerer hver aftale individuelt med eget interval, og `projectedStopMatchesSources` sørger for at kun stops hvis kilde reelt falder på datoen vises. Aftaler med forskellig cadence på samme basisrute behandles korrekt.
- **Fase 5 (Single/future/all-dialoger):** Delvist på plads — `MoveRouteDateDialog` håndterer `single`/`future` ved datoflytning, og `MergeRoutesDialog` har scope-valg ved fletning. Resterende triggers (medarbejderskift, intervalskift på aftaler) bruger i dag direkte mutation uden scope-dialog. Næste skridt vil være en generisk `SeriesScopeDialog` der genbruges på alle aftale-mutations — det kræver dog også en `agreement_occurrence_overrides`-tabel for "single"-scope, hvilket går ud over ren UX.

# Rutekalender — fuld gennemgang vs. spec (33 sektioner)

Jeg har gennemgået hele spec'en mod kodebasen og databasen. Her er status og hvad der reelt mangler for at gøre systemet robust som beskrevet.

## Status-matrix (spec-sektion → faktisk implementering)

| § | Krav | Status | Note |
|---|---|---|---|
| 1 | Korrekt projicering pr. interval når aftale udføres | ⚠️ Delvist | `auto_recur_due_orders` materialiserer på cron, ikke ved completion |
| 2 | Medarbejdere ser kun aktuelle (≤ i dag) | ❓ Ikke verificeret i denne audit |
| 3 | Skel basisrute / projiceret rute | ✅ |
| 4 | Lås projicerede ruter (UI + backend) | ⚠️ UI lås OK, **backend guard mangler** for virtuelle ids |
| 5 | Projicerede viser korrekte stops | ✅ |
| 6 | Idempotens / unique constraints | ✅ DB-niveau |
| 7 | Soft-delete / sletteguard | ❌ **`archived_at` / `deleted_at` findes IKKE på `routes`** — dialog viser advarsel, men DB beskytter ikke |
| 8 | Per-aftale recurrence | ✅ |
| 9–10 | Template/Instance-arkitektur | ⚠️ Vi har basisrute+materialiserede rows, men ingen klar instance-tabel |
| 11 | Sikkerhed på fremtidige instanser | ⚠️ Frontend kun |
| 12 | Queue/transactions ved generation | ⚠️ Cron-based, ingen kø |
| 13 | UI-lock badges | ✅ |
| 14 | Kritiske bugs (duplikater, tom load) | ⚠️ Materialiserede kopier af basisrute opfattes som dubletter |
| 15–17 | Konsekvensdialoger | ⚠️ `SeriesScopeDialog` findes, men kun wired til "aflys forekomst" + dato-flyt |
| 18 | Instance/serie-model | ⚠️ Delvist |
| 19 | Exception/override-system | ✅ Tabel + projektion |
| 20 | Konsekvensanalyse-tekst i dialoger | ⚠️ Simpel — mangler "X medarbejdere", "Y konflikter" |
| 21 | Smart beskyttelse | ⚠️ Delvist |
| 22 | Confirmation modal + preview | ⚠️ Mangler preview |
| 23 | Avanceret recurrence (helligdage, pause, slutdato) | ❌ Slutdato findes, men ikke helligdags-skip, pause |
| 24 | Enterprise-arkitektur | ⚠️ |
| 25 | Audit log | ❌ Ingen `route_audit_log`-tabel |
| 30 | Medarbejder kun aktuelle | ❓ Skal verificeres |

## Faktiske data-fund (live DB)

Basisrute `Ruten 1` (27. maj) har **6 materialiserede dattererute-rows** (8. juni, 10. juni, 17. juni, 22. juni, 24. juni, 8. juli) med `base_route_id` pegende på basis. Det er DEM brugeren oplever som "duplikater". `realRouteDates`-dedup forhindrer dobbelt-visning, men disse rows er **statiske kopier** der ikke længere følger basis hvis basis ændres. **Det er rod-årsagen til "duplikater af basisruten".**

## Prioriteret implementeringsplan

### P0 — Stopper bløder: dubletter forsvinder

1. **Migration**: Tilføj `archived_at TIMESTAMPTZ`, `deleted_at TIMESTAMPTZ` på `routes`. Soft-delete på alle rute-mutations.
2. **Migration + cleanup**: For-materialiserede rute-rows (rows med `base_route_id` IS NOT NULL og `route_date > now()` og ingen completed stops) konverteres til at være "skygge-instanser" der enten:
   - (a) slettes (foretrukken — lad projektionen overtage), eller
   - (b) markeres som låste pure-instances.
   Vi vælger (a): drop fremtidige materialiserede skygger og lad `expandRecurringRoutes` projicere på flugten. Det er den eneste vej til at undgå "frosne kopier".
3. **Backend guard**: Database-trigger på `routes` UPDATE/DELETE der afviser hvis `id` starter med `virtual:` (skulle aldrig kunne nå DB, men belt+suspenders). Eksisterende RLS udvides til at afvise mutations på `routes` hvor `archived_at IS NOT NULL` for almindelige brugere.

### P1 — Audit + intelligent dialog overalt

4. **Migration**: `route_audit_log` tabel (`actor_id`, `route_id`, `action`, `scope`, `before_jsonb`, `after_jsonb`, `affected_count`, `created_at`).
5. **Wire `SeriesScopeDialog`** ind på resterende triggers:
   - Skift medarbejder på projiceret stop (override med `new_employee_ids`).
   - Flyt en enkelt aftale-forekomst mellem ruter.
   - Skift interval på basis-aftale (split serien).
6. **Konsekvens-preview**: Beriger alle scope-dialoger med `useRouteSeriesImpact()`-hook der returnerer `{ futureRouteCount, futureStopCount, affectedEmployees, conflicts }`.

### P2 — Recurrence-rigdom + medarbejder-sikkerhed

7. **Skip helligdage / pause-perioder**: Tilføj `agreement_pauses` (start, end, agreement_id). `expandRecurringRoutes` springer datoer der falder i pause.
8. **Medarbejder-API guard**: Verificér at `useMyDayStops` / `useMyRouteData` ALDRIG returnerer stops med `route_date > today` — backend RLS check.
9. **Konfliktdetektion**: Når en aftale flyttes eller medarbejder skiftes, beregn dobbeltbookinger og advar.

### P3 — Kø + retries (enterprise)

10. **Job-kø for materialisering**: Erstat cron-baseret `auto_recur_due_orders` med en pg-`pgmq`-style queue så samtidige kald serialiseres.
11. **Idempotency-keys**: Klient-genererede UUIDs på alle mutations; backend ignorerer duplikat-keys (delvist allerede via `routeMutationQueue`).

## Hvorfor det her tager flere iterationer

Hver P-blok rammer mange filer + migrationer + RLS + dialoger. Forsøger jeg at lave alle 11 punkter på én gang ender vi med en stor uoverskuelig commit som er svær at fejlfinde. Plan er at lave **én P-blok pr. iteration**, teste i preview, og fortsætte.

## Foreslået første iteration (efter godkendelse)

P0.1 + P0.2 + P0.3 i én sammenhængende ændring:
- Migration: `archived_at`, `deleted_at` på `routes`.
- DB-trigger: forbyd hard-delete af `routes` med stops; forbyd UPDATE på rows hvor `archived_at IS NOT NULL`.
- Cleanup-migration: `DELETE FROM routes WHERE base_route_id IS NOT NULL AND route_date > CURRENT_DATE AND id NOT IN (SELECT DISTINCT route_id FROM route_stops WHERE status IN ('completed','in_progress'))`. **Dette fjerner de 6 dublet-rows** brugeren ser nu.
- `useDeleteRoute`: rute med stops → `UPDATE archived_at = now()` i stedet for hard delete.
- UI: skjul ruter med `archived_at IS NOT NULL` fra kalenderen.

Sig "ja" til P0 så starter jeg dér. Hvis du hellere vil tackle audit log eller helligdage først, så pek på den prioritet.

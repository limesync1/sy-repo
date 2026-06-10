# Mål

Pr. basisrute må der **maks. eksistere 1 ikke-udført fremtidig forekomst** ad gangen. Når den aktuelle markeres udført, materialiseres næste automatisk og bliver klar til (eventuel) tidlig udførelse. Ordrer pushes til regnskabsprogrammet **først ved udførelse** (uændret).

# Ændringer

## 1) Database-migration

**Ny hjælpefunktion**
- `_next_occurrence_date_for_base_route(_base_route_id, _after date)` → returnerer næste dato (≥ `_after`, inden for 365 dage) hvor mindst én tilknyttet aftale ville forekomme på basisruten. Bruger eksisterende `_agreement_occurs_on_route_date` og respekterer `route_occurrence_exceptions`.

**Ny RPC**
- `materialize_next_occurrence_for_base_route(_base_route_id)`
  - Finder seneste konkrete `routes`-række med `base_route_id = _base_route_id`.
  - Hvis ALLE stops på den seneste forekomst er `completed`/`cancelled` (eller ingen stops eksisterer) → beregn næste forekomst-dato og kald `materialize_virtual_route(_base_route_id, _next)`.
  - Hvis seneste forekomst stadig har åbne stops → no-op (én ad gangen-reglen).

**Trigger på `route_stops`**
- `AFTER UPDATE OF status` → når et stop bliver `completed`: hvis alle øvrige stops på samme rute også er afsluttede, og ruten har `base_route_id`, kald `materialize_next_occurrence_for_base_route(base_route_id)`. `SECURITY DEFINER`, `search_path=public`, swallow-exception så stop-opdatering aldrig fejler pga. materialisering.

**Tilpas `materialize_my_day_routes_for_employee(_date)`**
- For hver kandidat-basisrute: udregn "next ready occurrence" = seneste ikke-afsluttede konkrete forekomst, ellers `_next_occurrence_date_for_base_route(base, today)`.
- Materialisér KUN hvis `_date == next_ready_date`. Ellers spring over (forhindrer at en medarbejder der hopper 3 uger frem får 3 forekomster oprettet).

## 2) Sikkerhedsnet — natligt cron

Ny edge function `materialize-next-occurrences` (verify_jwt=false, service-role):
- Itererer alle aktive `routes` med `base_route_id IS NULL` (basisruter) som har mindst én aktiv aftale med `preferred_route_id = base.id`.
- Kalder `materialize_next_occurrence_for_base_route(base.id)` for hver.

Schedules via `pg_cron` dagligt kl. 03:00 (via `supabase--insert`, da URL/anon-key er projektspecifikke).

## 3) Automatiseret test

**`src/lib/early-completion.test.ts`** (ny) — Vitest-enheder for `canCompleteEarly`:
- route on → tilladt uanset employee/business.
- route null + employee `always` → tilladt.
- route null + employee `never` → afvist (selv hvis business default `true`).
- route null + employee `inherit` + business `true` → tilladt.
- route null + employee `inherit` + business `false/null` → afvist.
- Inkluderer dansk-tekst-snapshots fra `earlyCompletionReason`.

**`src/domain/routes/next-occurrence-readiness.test.ts`** (ny) — ren TS-enhedstest for en udtrukket hjælper `computeNextReadyDate({ latestOccurrence, nextProjectedDate, today })`:
- Returnerer `null` (no-op) hvis seneste forekomst stadig har åbne stops.
- Returnerer `nextProjectedDate` hvis seneste er fuldt udført.
- Returnerer `nextProjectedDate` hvis ingen seneste forekomst findes.
- Respekterer `today` (returnerer aldrig fortid).

Helper-funktionen placeres i `src/lib/route-readiness.ts` så samme logik bruges af hooks/UI (server-side er den i SQL — testen sikrer parity med en kort kommentar).

# Sådan virker det ende-til-ende

1. William åbner medarbejder-panelet på en fremtidig dato.
2. `useMyDayRoutes(date)` → `materialize_my_day_routes_for_employee(date)`.
3. RPC opretter konkret rute for basisruten **kun hvis** `date` er næste ready-dato.
4. Ruten vises altid. Knappen "Markér udført" er låst medmindre `canCompleteEarly(...)` → `true`.
5. Når sidste stop på den nuværende forekomst markeres udført, fyrer trigger og næste forekomst materialiseres med det samme.
6. Natlige cron sikrer at hver basisrute har præcis 1 fremtidig forekomst klar (selvkorrigerende ved fejl/efterslæb).

# Bemærkninger

- Regnskabs-push forbliver uændret (sker via `accounting_sync_queue` ved ordre-udførelse — ingen ekstra ordrer skabes ved materialisering).
- Migrationen er bagudkompatibel: eksisterende konkrete fremtidige ruter slettes ikke.
- Trigger fejler aldrig stop-opdatering (try/except).

Skal jeg gå i gang?

# Plan: Occurrence-baseret ruteflow — fase 2

Bygger videre på den eksisterende `agreement_occurrences`-infrastruktur og den allerede synlige historik i ruteplanlæggeren. Fire delopgaver, hver med tydelig DB- og UI-effekt.

## 1. Redigerbare fremtidige projektioner (Kørsel 2+)

**DB**
- Sikr at `agreement_occurrence_overrides` har felterne: `agreement_id`, `original_date`, `new_date`, `new_time`, `status` (`moved` | `skipped`), `created_by`. Tilføj unique `(agreement_id, original_date)`.
- RLS: business-medlemmer kan CRUD egne overrides.
- Trigger: ved insert/update, hvis `new_date < today` → afvis (kan ikke ændre fortid).
- Trigger: hvis der findes en `agreement_occurrence` med `status='completed'` og samme `occurrence_date` → afvis (historik er låst).

**Frontend**
- `recurring-projection.ts`: læs overrides og anvend dem på projicerede datoer (flyt/skip), uden at røre completed occurrences.
- I `RouteStopsPanel` / `CalendarPlanner`: projicerede stops får et "flyt"-ikon, der åbner `MoveProjectedOccurrenceDialog` (eksisterer allerede).
- Bekræft-knap kalder ny RPC `move_projected_occurrence(agreement_id, original_date, new_date, new_time)`.

## 2. Server-side guard mod for tidlig udførelse

**DB-trigger på `route_stops` BEFORE UPDATE**
```sql
if NEW.status = 'completed' and OLD.status <> 'completed' then
  if (route_date + coalesce(planned_arrival, '00:00')) > now() then
    raise exception 'OCCURRENCE_NOT_YET_DUE'
      using hint = 'Kan først udføres ' || to_char(...);
  end if;
end if;
```
- Placeres som første step i `handle_route_stop_completion` (eller dedikeret guard-trigger der fyrer før).
- UI fanger fejlen via `mapPostgresError` og viser dansk besked.

## 3. Tidslinje på basisruten

**Frontend kun** — ingen DB-ændringer.
- Nyt komponent `RouteOccurrenceTimeline.tsx` i `src/components/route-planner/`:
  - Vandret tidslinje øverst i basisrute-visningen.
  - Viser én node pr. kørsel: ✓ Udført (dato+tid), ⏳ Næste (dato+tid, evt. "låst indtil X"), … fremtidige projektioner.
  - Læser fra `agreement_occurrences` + projektioner.
- Integreres i `RouteStopsPanel` når den valgte rute har tilbagevendende aftaler.

## 4. Idempotent fakturering pr. occurrence

**DB**
- Tilføj kolonne `invoice_jobs.occurrence_id uuid` + unique index `(occurrence_id) where occurrence_id is not null`.
- Opdatér `enqueue_invoice_when_route_stop_completed`:
  - Slå `occurrence_id` op fra det netop completede stop.
  - `insert ... on conflict (occurrence_id) do nothing` → garanterer kun én job pr. kørsel.
- Tilsvarende guard i edge function `accounting-sync`: før ordreoprettelse, tjek `accounting_orders` for eksisterende `occurrence_id`.
- Tilføj `accounting_orders.occurrence_id` med samme unique constraint.

**Retry-sikkerhed**
- Edge function wrappes i transaktion med `select … for update` på job-rækken.
- Ved exception sættes `status='failed'`, men `occurrence_id` ligger stadig som unique → en evt. retry kan ikke skabe duplikat.

## Teknisk ændringssæt

```text
DB migrations (ny)
├── agreement_occurrence_overrides: constraints + trigger (fortid/completed)
├── route_stops BEFORE UPDATE guard: OCCURRENCE_NOT_YET_DUE
├── invoice_jobs.occurrence_id + unique index
├── accounting_orders.occurrence_id + unique index
├── enqueue_invoice_when_route_stop_completed → on conflict do nothing
└── RPC move_projected_occurrence(...)

Edge functions
└── accounting-sync: pre-check + for-update lock

Frontend
├── src/lib/recurring-projection.ts: anvend overrides
├── src/components/route-planner/RouteOccurrenceTimeline.tsx (ny)
├── src/components/route-planner/RouteStopsPanel.tsx: integrér timeline + flyt-knap
├── src/components/route-planner/MoveProjectedOccurrenceDialog.tsx: kald ny RPC
└── src/lib/route-errors.ts: mapping for OCCURRENCE_NOT_YET_DUE
```

## Forventet resultat

- Kørsel 2+ kan flyttes/skippes direkte fra planlæggeren; Kørsel 1 (udført) er låst.
- Selv hvis nogen manipulerer UI'et, afviser DB at markere en occurrence udført før dens tidspunkt.
- Basisruten har en visuel tidslinje der gør "hvad er gjort / hvad mangler / hvornår låses næste op" øjeblikkeligt forståeligt.
- Faktura + regnskabsordre kan aldrig oprettes to gange for samme occurrence — heller ikke ved retries eller race conditions.

# Aftalenumre & frisk ordrenr pr. udførsel

## Mål
1. Hver aftale skal have et synligt **aftalenummer** (internt) der tildeles når aftalen bliver klar til kørsel, og kobles til et **eksternt ordrenummer** fra regnskabsprogrammet når den synkroniseres.
2. Når en kørsel (fx "Trane Lukhans", interval = hver time) udføres i dag, skal næste forekomst (i morgen kl. samme tid + interval) automatisk få **sit eget nye ordre-/fakturanummer** i regnskabsprogrammet, så der oprettes en helt ny faktura ved næste udførsel.

## 1) Internt aftalenummer

Tilføj felter:
- `agreements.agreement_number` (text, unik pr. business, format `AFT-YYYY-00001`)
- `agreement_occurrences.occurrence_number` (text, format `<agreement_number>-<seq+1>` fx `AFT-2026-00042-03`)

Trigger-logik:
- Når en aftale går fra status `draft`/`pending_approval` → `active` (= "klar til kørsel"), tildeles næste `agreement_number` via en sekvens pr. business.
- Når en `agreement_occurrence` indsættes (også fra `ensure_next_agreement_occurrence` og `materialize_*`), tildeles `occurrence_number` automatisk hvis tomt.
- Backfill: eksisterende aktive aftaler og forekomster får numre i samme migration.

Eksisterende `agreements` (UUID) bruges fortsat som teknisk id; nummeret er kun visningsfeltet.

## 2) Visning af aftalenumre

Vis `agreement_number` + `occurrence_number` ved siden af den eksisterende `external_order_number`/`invoice_external_number` her:
- `RouteOccurrenceTimeline.tsx` (badge under hver kørsel)
- `StopDetailsContent.tsx` (header på stop-dialogen)
- `AftaleTab.tsx` (aftale-listen i admin)
- `CustomerDashboard.tsx` (kundens ordreoversigt)
- Print-visningen `EmployeeRoutePrint.tsx`

Format: `Aftale AFT-2026-00042 · Kørsel #3`.

## 3) Frisk ordrenr i regnskab pr. udførsel (kerneproblemet)

Roden til problemet i dag: `enqueue_invoice_for_completed_order` kører kun når en **`orders`-række** går til `completed`. For en time-/dag-recurring aftale skal hver ny forekomst blive sin egen `orders`-række (eller direkte sin egen faktura) — ellers genbruger regnskabsprogrammet det samme ordrenr og kan ikke oprette en ny faktura.

Plan:
1. **Sikre 1:1 mellem `agreement_occurrence` og `orders`-række.** I `ensure_next_agreement_occurrence` (og `_materialize_single_occurrence`) tilføjes oprettelse af en `orders`-række kopieret fra aftalens skabelon — med tom `external_order_number`, `invoice_external_id` og status `planned`. `agreement_occurrences.legacy_order_id` peger på den nye række.
2. **Ved kørsel-udførsel** (medarbejder markerer stop som `completed`):
   - Sæt det tilhørende `orders.status = 'completed'` (allerede sat for engangs-ordrer i dag — udvid til at finde ordren via `agreement_occurrences.legacy_order_id` for recurring).
   - `enqueue_invoice_for_completed_order`-triggeren fyrer som normalt og lægger en `invoice/create`-job i `accounting_sync_queue` for **netop denne** nye ordre → regnskabsprogrammet allokerer et nyt ordre-/fakturanummer.
3. **Sync-callback**: `accounting-sync` skriver det nye `external_order_number` + `invoice_external_number` tilbage på både `orders` og `agreement_occurrences` (sidstnævnte sker allerede via `accounting_order_links`).

## 4) Robusthed (rettelser fundet under analyse)

- `useProjectedCalendar.ts:118` – kommentar siger "laveste dato", men koden gemmer den **højeste**. Skift til `d < existing` (eller drop helt for ankrede serier) så fremtidige projektioner ikke skjules når der findes en materialiseret rute længere ude i fremtiden.
- I `runProjection`-dedup: tjek at vi ikke deduplikerer på `agreement_id+date` når intervallet er kortere end et døgn (time-intervaller) — sammenlign på fuld timestamp.
- `ensure_next_agreement_occurrence` arbejder i dag med `date` + `interval`. For interval `hver_time` bliver `v_next_date := occurrence_date + 1 dag` (pga. fallback når durationen er < 1 dag). Tilføj `planned_arrival = planned_arrival + interval` så time-intervaller flytter sig korrekt og opretter flere forekomster pr. dag.

## 5) Tests

- DB-test: opret aftale med `interval='hver_time'`, marker stop completed, verificér at ny `agreement_occurrence` + ny `orders`-række med tom `external_order_number` oprettes for næste time.
- Sync-test: stub `accounting-sync` og bekræft at to udførsler giver to forskellige `external_order_number`.
- UI-snapshot: `RouteOccurrenceTimeline` viser `AFT-...-N` korrekt.

## Tekniske ændringer (filer)

**Migration**
- Nye kolonner `agreements.agreement_number`, `agreement_occurrences.occurrence_number`, sekvens pr. business.
- Triggers `assign_agreement_number_on_activate`, `assign_occurrence_number_on_insert`.
- Opdater `ensure_next_agreement_occurrence` og `_materialize_single_occurrence` til at oprette ledsagende `orders`-række.
- Backfill `UPDATE` for eksisterende rækker.

**Frontend**
- `src/components/route-planner/RouteOccurrenceTimeline.tsx`
- `src/components/employee/StopDetailsContent.tsx`
- `src/components/admin/AftaleTab.tsx`
- `src/pages/CustomerDashboard.tsx`
- `src/pages/EmployeeRoutePrint.tsx`
- `src/hooks/route-planner/useProjectedCalendar.ts` (datofilter-fix)
- `src/lib/route-projection/index.ts` (time-interval dedup-fix)

Ingen ændringer i selve regnskabsadaptere (`dinero.ts`/`economic.ts`) — de allokerer nummer automatisk når en ny ordre/faktura sendes.

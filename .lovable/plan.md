# Plan: Unific\u00e9r ruter/aftaler-logikken

Du sagde "start med det der giver mening + migr\u00e9r data". Den r\u00e6kkef\u00f8lge giver st\u00f8rst v\u00e6rdi med mindst risiko:

1. **Fundament f\u00f8rst** \u2014 \u00e9n sandhed for tilbagevendende arbejde (`agreements` + `agreement_occurrences`)
2. **Migration** \u2014 flyt eksisterende `subscriptions` + deres ordrer ind i den model
3. **Hurtig kalender** \u2014 \u00e9n RPC erstatter 4 hooks
4. **Senere** \u2014 kapacitetsbevidst auto-fordel (n\u00e6ste runde)

## Hvorfor denne r\u00e6kkef\u00f8lge

I dag har du to parallelle modeller for "tilbagevendende arbejde":

```text
ORDERS + SUBSCRIPTIONS (gammel)        AGREEMENTS + OCCURRENCES (ny)
   \u2502                                       \u2502
   \u251c\u2500 next_service_date                    \u251c\u2500 occurrence_date
   \u251c\u2500 preferred_route_id                   \u251c\u2500 route_id (direkte link)
   \u2514\u2500 frontend-projektion                  \u2514\u2500 status, payment_status, due_date
```

`agreement_occurrences` er allerede den bedre model \u2014 den har `route_id`, `status`, betalings-felter og er materialiseret (ikke bare projiceret i frontend). Auto-fordel, kalender og kapacitet bliver alt sammen meget enklere n\u00e5r alt g\u00e5r gennem occurrences.

## Fase 1 \u2014 Migration (databasen)

**Migration A: Konvert\u00e9r subscriptions \u2192 agreements**

For hver aktiv `subscription`:
- Opret matching `agreement` (kopi\u00e9r kunde/adresse fra ordren, interval, total_price)
- Opret `agreement_items` fra `order_items`
- Tilf\u00f8j `legacy_subscription_id` p\u00e5 `agreements` (sporbar mapping)

For hver eksisterende `route_stop` med `order_id` eller `subscription_id`:
- Opret `agreement_occurrence` for det stop
- S\u00e6t `route_stops.agreement_occurrence_id` 
- Behold `order_id` for fakturering, men l\u00e6s status fra occurrence

For fremtidige planlagte besh\u00f8g (subscription.next_service_date):
- Opret `agreement_occurrence` med `status='planned'`, ingen `route_id` endnu

**Migration B: Opdat\u00e9r `auto_recur_due_orders`**

I dag opretter den nye `orders` + `route_stops` n\u00e5r en subscription forfalder.
\u00c6ndres til: opret `agreement_occurrence` (status=planned, ingen rute). Materialisering til rute sker n\u00e5r en bruger tildeler den.

**Migration C: Behold subscriptions som read-only view**

Ingen kode der skriver til `subscriptions` l\u00e6ngere. Tabellen bliver historik. Vi sletter den ikke endnu \u2014 sikkerhedsnet hvis noget overses.

## Fase 2 \u2014 Frontend skifter sandhed

- `recurring-projection.ts` slettes (ikke l\u00e6ngere n\u00f8dvendig \u2014 occurrences er materialiserede)
- `RoutePlanner` l\u00e6ser `agreement_occurrences` direkte ind p\u00e5 ruter (via stop.agreement_occurrence_id)
- Stop-kort viser status fra occurrence (planned/completed/cancelled) i stedet for at gisne
- "Aftaler uden rute" = `agreement_occurrences WHERE route_id IS NULL AND occurrence_date BETWEEN ...`
- Drop & drop til ny dato = `materialize_occurrence_to_route` RPC (findes allerede)

## Fase 3 \u2014 Samlet calendar-RPC

Ny RPC `get_calendar_data(business_id, from, to)` returnerer i \u00e9t kald:
- Routes for perioden
- Stops for de routes (med joined occurrence-status)
- Route-employees
- Unassigned occurrences i perioden

Erstatter `useRoutesForRange` + `useStopsForRoutes` + `useRouteEmployees` + `useUnassignedAgreementOccurrences` \u2014 fra 4 round-trips til 1.

## R\u00e6kkef\u00f8lge i implementering

1. Skriv migration A+B+C (\u00e9n samlet SQL-fil) \u2014 du godkender den eksplicit
2. Skift frontend til at l\u00e6se occurrences som sandhed
3. Tilf\u00f8j `get_calendar_data` RPC
4. Skift hooks til at bruge den ene RPC
5. Slet d\u00f8d kode (`recurring-projection.ts`, gammel `useUnassignedAgreementOccurrences` osv.)

## Risiko & sikkerhedsnet

- `subscriptions` slettes IKKE \u2014 kun read-only
- `legacy_subscription_id` p\u00e5 `agreements` g\u00f8r det muligt at rulle tilbage
- Eksisterende `route_stops.order_id` bevares \u2014 fakturering p\u00e5virkes ikke
- Migration k\u00f8rer i \u00e9n transaktion (alt-eller-intet)

## Det her ber\u00f8rer

Kode: `useRoutes.ts`, `RoutePlanner.tsx`, `recurring-projection.ts`, `MoveStopsDialog.tsx`, `useUnassignedAgreementOccurrences.ts`, `auto_recur_due_orders` (DB).  
Estimat: ~1 stor DB-migration + ~6\u20138 fil-\u00e6ndringer i frontend.

Sig til n\u00e5r du vil have mig til at starte (s\u00e5 begynder jeg med migrationen, som du f\u00e5r at godkende).
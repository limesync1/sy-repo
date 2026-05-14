# Plan: 5 opgaver

## 1. Vis medarbejder-avatars overalt hvor man til-/frakobler medarbejdere

Brug eksisterende `EmployeeAvatars`-komponent (eller `Avatar` med billede + initial-fallback) i alle steder hvor man tilkobler/frakobler medarbejdere fra/til en aftale, inkl. valg af standard-medarbejder ved oprettelse/redigering af services.

Steder der skal opdateres:
- Multi-select for medarbejdere på aftaler (RouteStopsPanel, StopDetailSheet, CalendarPlanner, AftaleTab)
- Dropdown/multi-select i service-oprettelse/redigering ("standard-medarbejder")
- Ordre-/aftale-redigering i admin

Tjek først hvilke komponenter bruges, og udvid dem så de viser `avatar_url` + farvet fallback med initialer foran medarbejdernavnet.

## 2. Forbedret "Optimér rækkefølge"

Justér `optimize-route` edge function så den:
- Kun skifter rækkefølge (ikke bemanding) — allerede default via `preserve_assignees`
- Bruger trafik-faktoreret rejsetid: skift OSRM/Mapbox kald til Mapbox Directions med `driving-traffic` profilen når Mapbox token er sat (giver faktiske trafikforhold på tidspunktet).
- Tager vejr i betragtning: hent prognose for rute-dato + start-koordinat (via eksisterende `useWeather`-mønster eller direkte open-meteo) og påfør en hastigheds-multiplier ved regn/sne/dårlig sigt (~1.10–1.25x rejsetid).
- AI-summary nævner trafik/vejr-justeringer.

Ingen UI-ændring; samme knap, bedre resultat.

## 3. Fjern "Optimér rækkefølge", "Flyt aftaler", "Slet" på projicerede ruter

I `RouteEditSheet`: tilføj `isProjection`-prop til typedefinition, og skjul de tre footer-knapper når `isProjection === true`. Pro­pen sendes allerede fra `RoutePlanner.tsx` (linje 2573).

## 4. Send faktura når aftale er markeret som udført

Når en `agreement_occurrences.status` skifter til `completed` (fra Aftaler-siden eller medarbejder-app):
- DB-trigger på `agreement_occurrences` køer `accounting_sync_queue` med `entity_type='occurrence_invoice'`, `operation='create_invoice'` ved overgang til completed (kun hvis ikke allerede faktureret).
- `accounting-sync` edge function håndterer ny operation: opretter faktura hos kundens regnskabsprogram (e-conomic/Dinero/Billy via eksisterende `_shared/accounting/` adapters), gemmer `invoice_external_id` + `invoiced_at` på occurrence.

## 5. Opret ordre i regnskabsprogram når aftale oprettes

Når en `agreement_occurrences` række oprettes (manuelt eller via projection-materialisering):
- DB-trigger køer `accounting_sync_queue` med `entity_type='occurrence_order'`, `operation='create_order'`.
- `accounting-sync` edge function understøtter operationen og opretter "ordre"/"tilbud"-entitet i regnskabsprogrammet. Linker via `accounting_order_links.agreement_occurrence_id` (kolonnen findes allerede).
- Skip hvis virksomheden ikke har aktiv `accounting_integrations`-række.

## Tekniske detaljer

- Migration: 2 nye DB-triggers på `agreement_occurrences` (insert → opret ordre, update completed → opret faktura). Begge gated på at virksomheden har aktiv accounting integration.
- `accounting-sync` udvides med to nye operationer; genbrug eksisterende `_shared/accounting` provider-grænseflade (skal udvides hvis `createOrder`/`createInvoiceFromOccurrence` ikke findes).
- Avatars: forventer `avatar_url`-felt på `employees` (er allerede tilgængelig — bruges af `EmployeeAvatars`).
- `optimize-route`: vejr fra open-meteo (gratis, ingen nøgle); trafik kræver Mapbox token (allerede konfigureret).

Rækkefølge for implementering: 3 (hurtigt) → 1 (UI-mellem) → 2 (edge function) → 5 + 4 (DB + accounting integration).

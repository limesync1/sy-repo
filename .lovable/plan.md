
# Rutekalender 2.0 — markant forbedring

Målet er at flytte planlæggeren fra "fungerer" til "tænker med brugeren". Hver handling skal:
- Forudse fejl før de sker
- Give præcise, handlingsanvisende fejlmeddelelser på dansk
- Foreslå smarte alternativer i stedet for bare at blokere
- Aldrig efterlade systemet i en inkonsistent tilstand

Planen er opdelt i 5 leverancer. Hver kan leveres selvstændigt; de bygger ovenpå hinanden men giver værdi enkeltvis.

---

## L1 — Centralt validerings- og fejl-bibliotek

Ét sted som alle handlinger i planlæggeren går igennem før de rammer databasen.

- Ny fil `src/lib/route-validation.ts` med rene funktioner:
  - `validateRouteMove(route, newDate, context)` — tjekker fortid, helligdag, eksisterende serie-konflikt, medarbejder-konflikt, kapacitet, åbningstider.
  - `validateStopAssignment(stop, targetRoute)` — tjekker duplikat-aftale på dagen, kunde-konflikt (samme kunde to gange samme dag), åbningstid på adresse, geografisk afstand vs. transporttid.
  - `validateMerge(source, target)` — tjekker farve-/medarbejder-mismatch, projiceret + projiceret, overlap af aftaler, kapacitet efter fletning.
  - `validateInterval(agreement, newInterval)` — preview af tilføjede/fjernede datoer, konflikter med ferier og pauser.
  - `validateBulkAction(routes, action)` — for "optimér alle", "tøm dag" osv.
- Hver validator returnerer et `ValidationResult`:
  ```ts
  { ok: boolean, errors: Issue[], warnings: Issue[], suggestions: Suggestion[] }
  ```
  hvor `Issue` har `code`, `severity`, `message` (dansk, konkret), `field`, `affectedIds`, og evt. `fix: () => Promise<void>`.
- Centralt fejl-katalog `src/lib/route-errors.ts` med 40-60 navngivne fejlkoder + danske beskeder (eksempler: `ROUTE_DATE_IN_PAST`, `DUPLICATE_AGREEMENT_SAME_DAY`, `EMPLOYEE_DOUBLE_BOOKED`, `MERGE_PROJECTION_INTO_PROJECTION`, `STOP_OUTSIDE_BUSINESS_HOURS`, `GEOGRAPHIC_GAP_TOO_LARGE`).
- Et `useValidation()`-hook UI'et bruger til realtime-feedback (rød/gul/grøn pille på drop-targets, knapper, inputfelter).

## L2 — Smart drag-and-drop med live-preview

I dag opdages konflikter først efter slip. Det skal vendes.

- Mens brugeren trækker:
  - Hver kalender-celle markeres grøn/gul/rød ud fra `validateStopAssignment` / `validateRouteMove` for det træk.
  - Tooltip med præcis årsag ved rød ("Anders har allerede 8 timers ruter den dag", "Kunden er allerede booket kl. 10").
  - Forslag ved gul ("Ruten bliver 95 km lang — vil du optimere efter slip?").
- Efter slip:
  - Ved warnings: bekræftelses-dialog med liste over warnings og knappen "Slip alligevel" + "Annullér" + evt. "Auto-fix".
  - Ved errors: blokering med præcis dansk besked, ingen toast-spam.
- Debounce på 250 ms på valideringen så det ikke laver flimmer.

## L3 — Intelligent planlægning og forslag

Planlæggeren skal selv komme med svar.

- **Forslag-motor** `src/lib/route-suggestions.ts`:
  - Når en aftale lander på en overfyldt rute: foreslå nærmeste tomme dag samme uge.
  - Når en aftale lander langt fra ruten: foreslå nærmere rute samme dag.
  - Når en medarbejder er dobbeltbooket: foreslå anden ledig medarbejder.
  - Når en serie får et nyt interval: vis preview af de næste 6 datoer, marker konflikter pr. dato.
- **Auto-fix knapper** i fejldialoger: "Flyt til nærmeste tomme dag", "Tildel anden medarbejder", "Optimér rækkefølge".
- **Daglig sundhedstjek** (allerede i `projectionDiagnostics` — udvides):
  - Banner øverst når der findes inkonsistens: "3 aftaler kan ikke projiceres — vis detaljer".
  - Klik åbner panel med per-aftale diagnose og fix-knap.

## L4 — Duplikat-forsvar i flere lag

Database-uniques findes (L1 i forrige plan). Vi tilføjer:

- **Frontend claim-token**: alle mutations får et idempotency-token genereret i UI'et, sendes med til RPC, så dobbeltklik / network-retry aldrig laver to records.
- **Mutation-kø pr. rute**: react-query mutation-keys serialiserer skrivninger til samme rute, så drag-drop-spam ikke racer.
- **Server-side dedup-RPC**: én `claim_and_execute(_kind, _idempotency_key, _payload)` der bruger `INSERT … ON CONFLICT DO NOTHING` på et claims-table før den udfører handlingen.
- **Periodisk dedup-scanner** (`detect-route-duplicates` cron, dagligt): finder dubletter på `(business_id, route_date, customer_id)` og logger til `route_audit_log` med severity `warning` så admin kan rydde op.

## L5 — Bedre fejlmeddelelser overalt

Audit af alle `toast.error(...)` og `throw new Error(...)` i planlæggeren:

- Erstatte generiske beskeder ("Noget gik galt", "Kunne ikke opdatere") med:
  - Hvad blev forsøgt
  - Hvorfor det fejlede
  - Hvad brugeren kan gøre
  - Evt. handlings-knap i toasten
- Eksempler:
  - Før: "Kunne ikke flytte rute"
  - Efter: "Ruten kan ikke flyttes til 14. juni — der findes allerede en rute fra samme serie. Vil du flette dem?" [Flet] [Annullér]
- Alle fejl logges samtidigt til `route_audit_log` med fuld kontekst (handling, payload, før/efter), så vi kan fejlsøge bagudrettet.

---

## Tekniske noter

- Validatorerne er rene funktioner — testbare med vitest uden DOM.
- Fejl-katalog er en const-record, så TypeScript håndhæver at alle koder har en dansk besked.
- L2 og L3 bygger ovenpå L1; L4 og L5 kan delvist leveres parallelt.
- Ingen database-skemaændringer nødvendige i L1, L2, L3, L5. Kun L4 kræver en migration (claims-table + dedup-cron).

## Foreslået rækkefølge

1. **L1** først — uden den er resten halvhjertet.
2. **L5** umiddelbart efter — store oplevelsesgevinster med lav risiko.
3. **L2** — bruger L1, men ændrer UX markant.
4. **L4** — sikrer at intet slipper igennem.
5. **L3** — fløden på toppen.

Sig til hvilken rækkefølge du vil have, eller om jeg skal udvide en leverance med mere detalje før jeg starter.

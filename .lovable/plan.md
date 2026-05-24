## Mål

Sikre at hele kæden — udførsel af aftale på rute → flyt til "Udførte" → automatisk næste kørsel på projiceret rute → automatisk ordre/faktura i regnskabsprogram — fungerer pålideligt og med synligt kørselsnummer overalt.

## Status i dag (det jeg har gennemgået)

Meget af infrastrukturen findes allerede i databasen:

- `handle_route_stop_completion` trigger: når et stop sættes til `completed`, lukkes `agreement_occurrence`, ordren markeres `completed`, og `completed_cycles` bumpes.
- `ensure_next_agreement_occurrence`: opretter automatisk næste planlagte forekomst på næste intervaldato, og placerer den på den projicerede/fremtidige rute hvis aftalen har en præfereret rute.
- `enqueue_order_for_new_occurrence`: når en ny forekomst får et `route_id`, lægges et `create_order`-job i `accounting_sync_queue` og `kick_accounting_sync` kaldes.
- `enqueue_invoice_on_stop_completion`: når et stop udføres, lægges et `create_invoice`-job.
- `materialize_virtual_route`: omdanner projiceret rute til konkret rute når dagen åbnes.
- "Kørselsnummer"-badges (`X. kørsel`) vises allerede i Aftaler-listen, Kunder-listen, ruteplanlæggerens stops og kolonner.

## Det der mangler / skal verificeres

1. **Aftale forsvinder ikke fra "Aftaler" og dukker ikke op under "Udførte"**
   - Når triggeren bumper `completed_cycles` på den oprindelige ordre og sætter `status='completed'`, så flytter aftalefiltreringen ordren væk. Men den nye forekomst skal opstå som et nyt, planlagt kort under "Aftaler" — i dag laver triggeren kun en `agreement_occurrence`, ikke en ny `orders`-række. Det skal jeg verificere og evt. fixe så listen viser den næste kørsel uden tomt hul.

2. **Konsistent kørselsnummer**
   - Sikre at den nye forekomst kommer ud med `cycles + 1` overalt: route stop card, aftalekort, kundekort, sheet. I dag bruger nogle steder `completed_cycles + 1` og andre `sequence_index`. Jeg samler det i én helper og bruger `agreement_occurrences.sequence_index` som autoritativ kilde.

3. **Projiceret rute → "gjort klar"**
   - I `materialize_virtual_route` skal forekomster på den dag enten arve `route_id` eller blive flyttet til den nye konkrete rute, så `enqueue_order_for_new_occurrence` skyder et `create_order` job. Verificeres med en test.

4. **Accounting hooks**
   - Bekræft at `accounting_sync_queue` faktisk har handlers for `operation='create_order'` (entity_type `agreement_occurrence`) og `create_invoice`, og at `accounting-sync` edge function konsumerer dem. Hvis manglende, tilføj.

5. **UI**
   - "Udførte"-sektionen på Aftaler-siden skal vise tidligere kørsler tydeligt med kørselsnummer (`3. kørsel — udført 12. maj`).
   - Den næste planlagte kørsel skal vises som et nyt kort under "Kommende" med `X. kørsel` og dato + rute.

## Plan

### Trin 1 — Diagnose (ingen kodeændringer)

- Verificér i databasen at triggeren faktisk opretter næste `agreement_occurrence` og at den får `route_id` når aftalen har præfereret/projiceret rute.
- Verificér at `accounting_sync_queue` har relevante jobs efter en test-completion.
- Kør `recurring-orders` cron og `materialize_virtual_route` mod en testaftale.

### Trin 2 — Databasefix (én migration)

- Sikre at `handle_route_stop_completion` også synkroniserer `orders`-rækken (eller opretter en ny `orders`-række for næste kørsel), så Aftaler-listen automatisk viser den næste kørsel uden manuel oprettelse.
- Indeksér `agreement_occurrences (agreement_id, sequence_index)` så vi billigt kan finde "næste kørselsnummer".
- Patch `materialize_virtual_route` så åbning af projiceret rute kicker accounting-sync for alle stops på den dag.

### Trin 3 — Accounting edge function

- I `accounting-sync` index.ts: sikre at både `create_order` (når dagen materialiseres) og `create_invoice` (når stop udføres) behandles og er idempotente.
- Tilføj log/toast så brugeren får besked når regnskabsordre/faktura er oprettet.

### Trin 4 — UI/UX

- Aftalekort: vis "Næste: 4. kørsel — onsdag 27. maj · Rute Aarhus N" på det aktive kort.
- Udførte-sektion: vis liste af tidligere kørsler (occurrences) med nummer, dato og evt. faktura-nummer.
- Helper `formatCycleLabel(occurrenceOrOrder)` i `src/lib/` så alle visninger bruger samme format.

### Trin 5 — Smoke test

- Opret testaftale ugentlig → læg på rute → markér udført → bekræft: forekomst lukkes, næste forekomst oprettes på næste uge på samme rute, accounting-queue får ét `create_order` (når dagen åbnes) og ét `create_invoice` (efter udførsel).

## Tekniske detaljer (kort)

- Migration filer: `supabase/migrations/<timestamp>_agreement_cycle_flow.sql`.
- Berørte funktioner: `handle_route_stop_completion`, `ensure_next_agreement_occurrence`, `materialize_virtual_route`, `enqueue_order_for_new_occurrence`.
- Berørte komponenter: `AftaleTab.tsx`, `CustomersTab.tsx`, `RouteStopsPanel.tsx`, `EmployeeColumn.tsx`, ny `src/lib/cycle-label.ts`.
- Edge function: `supabase/functions/accounting-sync/index.ts` (verificér handlers).

## Spørgsmål før jeg går i gang

1. Når du udfører et stop nu — flyttes aftalen så til "Udførte" på Aftaler-siden, eller bliver den bare stående? (afgør om trin 2 kræver ekstra orders-håndtering)
2. Bruger du allerede regnskabsintegration (Dinero/e-conomic) på testkontoen? Skal jeg verificere mod en konkret virksomhed, eller bare sikre at hooks fyrer korrekt i kø?
3. Skal "Udførte" vise hver enkelt tidligere kørsel som separate kort, eller ét aftalekort med en udfoldelig historik?

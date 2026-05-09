
# Ny aftale-model: serier, intervaller, ruter & arvet medarbejder

Vi laver "Aftaler" om fra enkeltstående ordrer til **serier** (Outlook-stil) med opstartsdato + interval, en valgfri default-rute, og medarbejder der arves fra servicen. Forekomster materialiseres rullende ind i rutekalenderen så du kan se næste gang + alle fremtidige gange.

## Sådan kommer det til at fungere (for brugeren)

1. **Service oprettes** → vælg en eller flere medarbejdere som default-team.
2. **Aftale oprettes** (kunde booker eller admin opretter manuelt) → vælg:
   - Opstartsdato
   - Interval (engangskøb, ugentligt, hver 2. uge, hver 4. uge, månedligt, …) + evt. slutdato
   - Default-rute (rute-skabelon, fx "Mandagsrute Nord") — kan også vælges/ændres senere på Aftaler-siden
   - Medarbejder (forudfyldt fra service, kan overstyres)
3. **På Aftaler-siden** kan du:
   - Se aftalen med "næste gang: man 12. maj" + liste over kommende forekomster
   - Klikke ind og skifte default-rute fra et dropdown
   - Trække aftalen i en rute-pool (som i dag) — dét flytter den næste forekomst
4. **I Rutekalenderen** ser du alle materialiserede forekomster så langt frem du scroller. En enkelt forekomst kan flyttes/aflyses uden at det rører resten af serien (Outlook "kun denne begivenhed" vs. "hele serien").

## Arkitektur

```text
services ──(default_employee_ids)──┐
                                   ▼
business_customers              agreements (ny)              route_templates (ny)
        │                       ├─ start_date                ├─ name "Mandagsrute Nord"
        │                       ├─ interval                  ├─ weekday/cadence
        └─────────────────────► ├─ end_date (nullable)       ├─ default_employee_id
                                ├─ default_route_template_id ┘
                                ├─ employee_ids (override)
                                ▼
                        agreement_occurrences (materialiseret)
                                ├─ occurrence_date
                                ├─ status (planned/done/cancelled/skipped)
                                ├─ route_id (konkret dag-rute)
                                └─ employee_ids (override pr. forekomst)
                                ▼
                        routes (eksisterer) — én pr. dato, født af route_template
```

## Datamodel-ændringer

**Wipe**: `orders`, `order_items`, `route_stops`, `routes`, `subscriptions` (data, ikke skema endnu) ryddes for at starte rent.

**Nye tabeller:**
- `agreements` — selve serien. Felter: `business_id`, `business_customer_id`, `start_date`, `interval` (enum: `once`, `weekly`, `biweekly`, `every_4_weeks`, `monthly`, `custom_days`), `interval_days` (for custom), `end_date`, `default_route_template_id`, `employee_ids[]` (override), `total_amount`, `notes`, `status` (`active`/`paused`/`ended`), prising/fakturafelter overført fra `orders`.
- `agreement_items` — linjer (service_id, qty, price) — erstatter `order_items`.
- `route_templates` — genbrugbar rute-skabelon: `name`, `weekday` (0–6) eller `cadence`, `default_employee_id`, `start_address`, farve.
- `agreement_occurrences` — materialiseret forekomst: `agreement_id`, `occurrence_date`, `route_id` (nullable indtil placeret), `status`, `employee_ids` (override), `completed_at`.

**Ændringer på eksisterende:**
- `services.default_employee_ids uuid[]` tilføjes — vises som multi-select i service-form.
- `routes` får `route_template_id` (nullable) så vi ved hvilken skabelon en konkret dag-rute kommer fra.
- `route_stops` peger fremover på `agreement_occurrence_id` i stedet for `order_id` (kolonnen tilføjes; `order_id` fjernes efter wipe).

**Materialisering** (rullende vindue):
- Når kalenderen vises for en periode (fx +12 uger), kalder klienten en RPC `ensure_occurrences(business_id, until_date)` der genererer manglende `agreement_occurrences` for alle aktive aftaler ud fra deres interval.
- Default tildeles `route_id` ud fra `default_route_template_id` + ugedag (vi opretter `routes`-rækken hvis den ikke findes for den dato).
- Drag/drop i pool eller kalender opdaterer `agreement_occurrences.route_id` for én forekomst — serien er uændret.
- "Rediger hele serien" vs. "kun denne forekomst" eksponeres i UI.

## UI-ændringer

- **ServicesTab / service-form**: ny "Standard medarbejdere" multi-select.
- **AftaleTab**: 
  - Liste viser én række pr. **aftale** (ikke pr. forekomst) med kolonner: Kunde · Service · Interval · Næste gang · Default-rute · Medarbejder · Status.
  - Detalje-sheet: opstartsdato, interval-vælger, default-rute dropdown, medarbejder-override, slutdato, samt "Kommende forekomster" liste (klik = hop til den dato i rutekalenderen).
  - Pool nederst (uplaceret) virker som i dag — drag flytter `agreement_occurrences.route_id`.
- **Route Planner**: 
  - "Rute-skabeloner" sektion (CRUD af `route_templates`).
  - Kalenderen kalder `ensure_occurrences` ved navigation; viser materialiserede forekomster.
  - "Rediger" på et stop: vælg "Kun denne gang" / "Hele serien fremad".
- **Customers**: "Aftaler"-fanen i kundekortet viser serier + næste forekomst.

## Implementeringsfaser

1. **DB**: wipe + nye tabeller + RLS + RPC `ensure_occurrences`.
2. **Services**: tilføj `default_employee_ids` i form + visning.
3. **Agreements backend**: hooks (`useAgreements`, `useAgreementOccurrences`) + opret/rediger/slet.
4. **AftaleTab UI** rebuild på den nye model.
5. **Route templates** + materialisering i kalender + drag/drop pr. forekomst.
6. **Customer-aftaler-fane** opdateret.
7. **Oprydning**: fjern død kode (`subscriptions`-flow, `recurrence_cycle` på orders, gamle "approval"-felter beholdes på agreements).

## Tekniske noter

- Interval-beregning gøres server-side i SQL (`generate_series` + offsetting) for konsistens.
- Approval-flow (kunde godkender pris) flyttes fra `orders` til `agreements` (én godkendelse pr. serie ved oprettelse, ikke pr. forekomst).
- Fakturering: én faktura pr. `agreement_occurrence` der er markeret `done` (samme som i dag pr. ordre) — accounting-koblingen genbruges, vi peger bare på `agreement_occurrence_id` i stedet for `order_id`.
- Edge functions der i dag rører `orders` (`customer-approve-order`, `recurring-orders`, `accounting-sync`, `apply-route-suggestion`) opdateres eller udfases — `recurring-orders` cron bliver overflødig, da forekomster nu materialiseres on-demand.

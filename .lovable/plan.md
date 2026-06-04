
## Sådan fungerer det nu

Når en medarbejder markerer et stop som "udført" på en rute med en aftale på 10‑minutters interval, sker følgende kæde:

1. **Stoppet opdateres** til `status = 'completed'` (fra `EmployeeRoute.tsx` via `updateStatus.mutateAsync`).
2. **Trigger `handle_route_stop_completion`** (sidst rørt i migration `20260419125146…`) fyrer på `route_stops` og:
   - finder dominerende interval på ordren,
   - sætter `orders.next_service_date = now() + interval` (for 10‑min: nu + 10 min),
   - bumper `completed_cycles + 1`,
   - sætter `subscriptions.preferred_route_id` og `next_service_date` tilsvarende,
   - lader ordren stå som `confirmed` så den genbruges.
3. **Trigger `enqueue_invoice_when_route_stop_completed`** lægger en faktura‑opgave i kø.
4. **Cron `recurring-orders` → RPC `auto_recur_due_orders`** kører løbende og materialiserer næste forekomst som et nyt `route_stop` — men med `now()` som dato i stedet for den beregnede kalenderdato.

### Hvorfor "hele basisruten forsvinder"

- Det udførte stop er stadig på basisruten, men UI'et filtrerer completed stops væk, så ruten ser tom ud.
- `auto_recur_due_orders` sprøjter løbende nye stops ind på basisruten med `now()`, hvilket forvirrer `expandRecurringRoutes` — datoer hvor der allerede er et "rigtigt" route_stop springes over, så de virtuelle gentagelses‑markeringer forsvinder fra kalenderen.
- 10‑min intervallet udstiller en eksisterende svaghed: kæden er designet til uge/måned‑cadences, ikke minut‑cadences.

## Sådan skal det fungere fremover

### 1. Udfør én forekomst ad gangen — knyttet til dato/tidspunkt
- Stoppet sættes `completed` (uændret).
- Der upsertes en `agreement_occurrences`‑række for præcis det tidspunkt med `status = 'completed'` og `sequence_index = N` (kørselsnummer).
- Samme dato/tidspunkt kan ikke udføres igen — unique constraint på (agreement_id, occurrence_date).

### 2. Faktura + regnskabsordre pr. kørsel
- `enqueue_invoice_when_route_stop_completed` udvides med `occurrence_id` + `cycle_number`.
- Regnskabseksporten danner én ordre pr. kørsel (ikke pr. master‑ordre).

### 3. Udførte kørsler bliver SYNLIGE i ruteplanlæggeren som "fortid"
**Dette er centralt — basisruten må aldrig "tømmes".**
- Completed stops filtreres IKKE længere væk fra basisrutens visning.
- Hver udført forekomst vises som en låst/dæmpet række med tydelig markør:
  - badge "Kørsel N · Udført"
  - tidsstempel for udførelse
  - "fortids"‑styling (muted baggrund, gennemstreget, evt. ikon ✓)
  - klik åbner detaljer med faktura‑/regnskabs‑status, ikke redigering
- Dette gælder både på den aktuelle dag og når man scroller tilbage i kalenderen — basisruten bevarer sin historik visuelt.

### 4. Næste kørsel oprettes med det samme — men låst til sin egen dato
**Når en kørsel markeres udført:**
- `handle_route_stop_completion` opretter straks næste `agreement_occurrence` (kørsel N+1) med:
  - `occurrence_date` = sidste udførelses tidspunkt + interval (for 10‑min: completed_at + 10 min)
  - `status = 'pending'`
  - `sequence_index = N+1`
- `auto_recur_due_orders` materialiserer occurrencen som et nyt `route_stop` på samme basisrute — **men placeret på den beregnede kalenderdato**, ikke `now()`.
- Stoppet vises straks i ruteplanlæggeren som "Kørsel N+1 · Planlagt".

**Udførelse er låst indtil dagen er aktuel:**
- Medarbejder‑UI'et (`EmployeeRoute.tsx` / `StopDetailsContent.tsx`) deaktiverer "Marker udført"‑knappen hvis `route_date > today` (eller for 10‑min: hvis `occurrence_date > now()`).
- Server‑side guard i `handle_route_stop_completion` afviser completion hvis `now() < occurrence_date` (returnerer fejl, ruller status tilbage).
- UI viser tydeligt: "Kan først udføres [tidspunkt/dato]".

### 5. Fremtidige projicerede kørsler kan stadig redigeres
- Virtuelle forekomster (`expandRecurringRoutes`) vises uændret for datoer ud over den næste materialiserede.
- Bruger kan flytte/aflyse enkelte forekomster via `agreement_occurrence_overrides` — uden at røre serien.

## Tekniske ændringer

```text
DB / triggers
├── handle_route_stop_completion
│   • upsert agreement_occurrences(occurrence_date, status='completed',
│     sequence_index=N, completed_at=now())
│   • opret NÆSTE occurrence (N+1) med dato = completed_at + interval
│   • bump completed_cycles på AFTALEN
│   • ingen ændring af preferred_route_id hvis allerede sat
│   • guard: afvis hvis now() < NEW.occurrence_date
│
├── auto_recur_due_orders (RPC)
│   • opret stop kun hvis (route_id, occurrence_date) ikke findes
│   • placer stop på occurrence_date — ikke CURRENT_DATE
│   • link via agreement_occurrence_id
│
└── enqueue_invoice_when_route_stop_completed
    • payload: + occurrence_id, cycle_number
    • regnskabseksport: én ordre pr. kørsel

Frontend
├── RouteStopsPanel / CalendarPlanner / MobileRouteDetailSheet
│   • behold completed stops i visningen
│   • render "fortid"‑variant: muted, badge "Kørsel N · Udført",
│     tidsstempel, ikke‑interaktiv
│
├── EmployeeRoute / StopDetailsContent
│   • disable "Marker udført" hvis occurrence_date > now()
│   • vis hint: "Kan først udføres [dato/tid]"
│
├── recurring-projection.ts
│   • lad ikke completed stops fjerne projektion af fremtidige datoer
│
└── cycle-label.ts
    • brug sequence_index fra agreement_occurrences som autoritativ kilde
```

## Forventet resultat

- 10‑min‑testruten forbliver synlig i ruteplanlæggeren — med fuld historik over udførte kørsler.
- Hver udførelse: faktura + regnskabsordre pr. kørsel; samme tidspunkt kan ikke udføres igen.
- Næste kørsel dukker op øjeblikkeligt som "Kørsel N+1 · Planlagt" på basisruten, men kan først markeres udført når dens dato/tidspunkt er aktuel.
- Fremtidige projicerede kørsler kan stadig flyttes/redigeres uden at bryde serien.


# Aftaler ↔ Ruter ↔ Regnskab — kort version med Ready2Clean-eksempel

## Modellen i én sætning

> En **aftale** er en serie (kunde + service + interval). Den hænger på en **rute-skabelon**. Når kalenderen åbnes, **udfoldes** den til faktiske stop — og når et stop markeres **udført**, ryger det automatisk videre til regnskabsprogrammet (e-conomic / Billy / Dinero).

```text
Service ─► Aftale (interval) ─► Rute-skabelon ─► Forekomst i kalender ─► Udført ─► Faktura i regnskab
```

## Konkret eksempel — Ready2Clean ApS

Service: "Udvendig vinduespudsning" (standard: Anna, 45 min, 450 kr).

**3 aftaler:**

| Kunde | Interval | Default-rute | Pris/gang |
|---|---|---|---|
| Café Mocca | Hver 2. uge (man) | Mandagsrute Aarhus C | 450 kr |
| Tandlæge Hansen | Hver 4. uge (man) | Mandagsrute Aarhus N | 600 kr |
| Familien Jensen | Engangskøb | — (pool) | 450 kr |

**I kalenderen — man 11. maj:**
```text
Mandagsrute Aarhus C (Anna) → Café Mocca       ✓ udført 10:30
Mandagsrute Aarhus N (Bo)   → Tandlæge Hansen  ✓ udført 13:15
```

**Det der sker automatisk når Anna trykker "Udført":**
1. `agreement_occurrences.status = done` + `completed_at` sættes
2. `accounting_sync_queue` får en `invoice_create` for forekomsten
3. `accounting-sync` kører: opretter kladde-faktura i e-conomic på Café Mocca (kunde matchet via `accounting_customer_links`), linje = "Udvendig vinduespudsning · 11. maj 2026" · 450 kr
4. Faktura-nr + status gemmes på `agreement_occurrences.invoice_external_id` + `invoice_status`
5. Når kunden betaler → webhook/cron opdaterer `payment_status = paid` på forekomsten

Næste mandag d. 25. maj rammer Café Mocca igen automatisk → ny forekomst → ny faktura når den udføres. Ingen manuelle ordrer, ingen dobbelt-tastning.

## Regnskabs-koblingen (det vigtige)

| Niveau | Hvad sendes til regnskab | Hvornår |
|---|---|---|
| **Kunde** | Café Mocca → e-conomic kunde-nr 1042 | Ved første aftale-oprettelse (eller eksisterende link genbruges) |
| **Produkt** | "Udvendig vinduespudsning" → e-conomic produkt-nr 100 | Ved service-oprettelse / første brug |
| **Faktura** | 1 forekomst = 1 faktura | Når stop markeres udført |
| **Status tilbage** | Betalt / forfalden / kreditnota | Pull fra regnskab via cron |

Eksisterende tabeller bruges direkte:
- `accounting_customer_links` (kunde → ekstern ID)
- `accounting_product_links` (service → ekstern produkt)
- `accounting_order_links` → udvides/erstattes til at pege på `agreement_occurrence_id` i stedet for `order_id`
- `accounting_sync_queue` får `entity_type = 'agreement_occurrence'`

**Faktureringsmodeller pr. aftale** (vælges ved oprettelse):
- **Pr. besøg**: én faktura hver gang stoppet udføres (Ready2Clean default)
- **Månedlig samlefaktura**: alle udførte forekomster i måneden samles på én faktura pr. kunde (relevant for B2B med mange besøg, fx Tandlæge Hansen kunne få "4 besøg i juli = 1 faktura")
- **Forudbetalt periode**: én faktura ved aftale-start dækker fx 6 mdr. (mindre relevant for vinduespudsning, men kan tilføjes senere)

## Daglig drift — eksempler

- **Café Mocca flytter ét besøg** → "Kun denne gang" → tirsdag i stedet. Faktura følger den nye dato.
- **Anna er syg** → Cafés stop flagges "mangler ressource", admin re-assigner til Bo. Regnskab uændret.
- **Tandlæge Hansen siger op** → "Afslut serien". Allerede udførte besøg er allerede faktureret; fremtidige forekomster slettes.
- **Faktura sendt med fejlpris** → ret på forekomsten → "Send kreditnota + ny faktura" knap (bruger eksisterende accounting-action edge function).

## Implementerings-rækkefølge

1. **ServicesTab**: Standard-medarbejder + standard-varighed + standard-pris
2. **Hooks**: `useAgreements`, `useRouteTemplates`, `useEnsureOccurrences`
3. **Rute-skabeloner** CRUD i Rutelaneren
4. **AftaleTab rebuild**: liste pr. aftale, "næste gang"-kolonne, detalje-sheet (interval, rute, faktureringsmodel)
5. **Rutekalender**: forekomster i stedet for ordrer; pool; drag/drop flytter én forekomst
6. **Stop-sheet**: "Kun denne gang" vs. "Hele serien fremad"
7. **Regnskabs-integration**: opdater `accounting-sync`, `customer-approve-order` → `agreement_occurrence_id`; samlefaktura-job for månedlig model
8. **Notifikationer** peger på forekomster
9. **Oprydning**: fjern `subscriptions`, `recurring-orders` cron, gamle `order`-felter

---

Lyder det rigtigt? Sig til hvis fakturerings-modellen skal være anderledes — fx om Ready2Clean skal kunne sætte "samlefaktura pr. måned" som default på erhvervskunder, eller om vi skal vente med samlefaktura til senere fase.

# Fakturainterval — én samlet faktura pr. kunde pr. periode

Gælder kun virksomheder med forbundet regnskabsprogram. I dag laves der én faktura pr. udført besøg.

## Sådan kommer det til at virke

- **Valg:** Efter hvert besøg (som i dag), Hver 14. dag, Månedligt, Kvartalsvis eller Brugerdefineret ("Hver [N] [dage/uger/måneder]").
- **Hvor det sættes:**
  - Regnskab → standard for hele virksomheden
  - Kunde → "Brug virksomhedens standard" eller eget valg
  - Aftale → "Brug kundens valg" eller eget valg
  - Rækkefølge: aftale > kunde > virksomhed > efter hvert besøg
- **Når et besøg udføres** med samlet fakturering, laves der ikke en faktura med det samme. Besøget lægges i kundens "samlede faktura" for perioden.
- **Ved periodens slutning** (måned og kvartal følger kalenderen, 14 dage og brugerdefineret følger kundens startdato) laves én faktura pr. kunde. Den har én linje pr. besøg med service, udført dato og pris uden moms.
- **Besøg med forskellige intervaller hos samme kunde** samles efter kundens interval. Et eget interval på en aftale giver en separat faktura.
- **Fakturaen havner som kladde i regnskabsprogrammet**, ligesom i dag, så I kan kontrollere den før afsendelse.
- **Synligt i panelet:**
  - Aftaler viser "Samles på faktura d. 30. nov." i stedet for "Faktureres".
  - Regnskab viser kommende samlede fakturaer pr. kunde med antal besøg og beløb.
  - Knappen "Fakturér nu" lukker perioden med det samme.
- **Kreditnota og annullering:** Et besøg, der ikke er faktureret endnu, fjernes bare fra den samlede faktura. Er den allerede lavet, bruges kreditnota som i dag.

## Tekniske detaljer

- Migration:
  - `invoice_interval` (enum: per_visit, every_14_days, monthly, quarterly, custom) og `invoice_interval_days`/`unit` som nullable felter på `accounting_integrations` (standard), `business_customers` og `agreements`/`orders`.
  - Ny tabel `invoice_batches` (business, kunde, periode-start/slut, status, external_id) og `invoice_batch_items` (unik kilde: ordre/forekomst), med GRANT og RLS.
  - Eksisterende `monthly_consolidated` mappes til monthly.
- Én SQL-resolver `resolve_invoice_interval(...)`. Den bruges i alle tre steder, der i dag sætter faktura i kø: `_apply_completion_invoice`, `enqueue_invoice_for_completed_order` og `enqueue_invoice_on_stop_completion`. Ved samlet interval tilføjes kilden til batch i stedet for at oprette fakturajob.
- `accounting-sync`:
  - Nyt job `invoice_batch` → `bookInvoiceBatch`. Det samler alle linjer i ét `upsertOrder` og ét `bookInvoice`, gemmer external_id på batch og kilder og er idempotent ved retry.
  - Gamle enkeltjob for kilder i et batch springes over.
- Cron hver time lukker forfaldne batches og sætter dem i kø.
- Test af resolver-rækkefølge og periodeberegning (måned/kvartal/14 dage/brugerdefineret).
- UI: fælles `InvoiceIntervalPicker` i Regnskab, kundevindue og aftalevindue.

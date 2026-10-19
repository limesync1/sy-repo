# Services i «Opret bestilling» — gennemgang og forbedringer

## Fejl og uklarheder fundet
1. **Fast pris uden antal:** Listen viser fx «450 kr pr. vindue», men man kan ikke vælge antal. Subtotalen er altid 1 stk.
2. **Prisberegner uden felter:** Service med prisberegner, men ingen felter, viser intet at udfylde og giver 0 kr. Der er ingen advarsel.
3. **«Fra X kr» passer ikke:** Listen viser «Fra 300 kr» (grundpris), men subtotalen lægger kun felterne sammen. Det skal tjekkes mod serverens beregning, så tallet i vinduet matcher.
4. **Felternes plus/minus:** Plus/minus tæller altid 1 op, også ved m² (fx 1 → 120 m² kræver mange tryk). Mangler grænse giver max 9999. Man kan ikke skrive tallet direkte.
5. **Søgning:** Valgte services vises altid, også når de ikke matcher søgningen eller kategorien. Det ser ud som om søgningen ikke virker. Søgeordet fremhæves ikke. Der tælles ikke, hvor mange der matcher.
6. **Dobbelt information:** Intervalmærkerne i listen og intervalknapperne i indstillingerne viser det samme. «+3 mere» kan kun ses ved at holde musen over.
7. **Fjern uden fortryd:** Trykker man «Fjern», er alle indtastede felter væk med det samme.
8. **Computer:** «Valgte services» til højre står tom og fylder halvdelen af bredden, før noget er valgt. Når listen er lang, er rækkefølgen kun alfabetisk.
9. **Mobil:** Indstillingerne folder ud inde i listen. Med flere valgte services bliver listen meget lang, og det er svært at se, hvad der er valgt.
10. **Ingen tom-tilstand:** Har virksomheden ingen aktive services, er der ingen genvej til at oprette en.

## Ændringer
- **Antal ved fast pris:** Nyt «Antal»-felt (standard 1). Subtotal = pris × antal. Antal sendes med, som timer gør i dag.
- **Prisberegner:** Gul note «Denne prisberegner har ingen felter — prisen bliver 0 kr» og grundprisen tages med i subtotalen, hvis serveren gør det. Det bekræftes først i serverens prislogik.
- **Smartere felter:** Plus/minus følger enheden (m² i trin af 5/10 osv., samme logik som andre steder). Tallet kan skrives direkte. Grænser vises småt («1–500 m²»).
- **Søgning:** Valgte services filtreres som alle andre. Over listen står «2 valgt (skjult af søgning)», og man kan trykke på dem. Det søgte ord fremhæves. Linjen «5 services» vises. Søgning fungerer uden at skelne store/små bogstaver og æ/ø/å.
- **Mindre støj i listen:** Listen viser kun «Engangskøb» eller «Gentagende · 4 intervaller». Hvert interval vælges i indstillingerne. Det andet ligger under «Detaljer».
- **Fortryd ved Fjern:** Kort besked «Service fjernet · Fortryd», som genskaber felter og dato.
- **Computer:** Mens intet er valgt, får listen mest plads, og højre side er en smal guide. Højre side bliver bredere ved første valg. Ofte brugte services (fra virksomhedens tidligere bestillinger) står først under «Mest brugt».
- **Mobil:** Valgte services samles i én fold-ud-kasse «Valgte (2) · 1.250 kr uden moms» lige over bundlinjen. Hver valgt service har sin egen fold, så kun én er åben ad gangen.
- **Tom-tilstand:** «Ingen aktive services» med knap til siden Services.
- **Tilgængelighed:** Tydelige fokusrammer, rigtig radio-rolle på intervaller, tal læses op med enhed. Touchflader ≥44 px.

## Ikke ændret
Serveren beregner fortsat den endelige pris. «Uden moms» bevares. Ingen ændring af mails eller af selve oprettelsen, ud over at antal sendes med.

## Kontrol
Playwright som ejer af Jimmy's VP ved 320, 390, 768 og 1351 px, lyst og mørkt tema: søg, filtrér, tilføj/fjern/fortryd, antal og felter. Subtotal sammenlignes med serverens pris i et prøveopkald uden at gemme. Test for subtotal (fast pris × antal, timepris, prisberegner).

## Tekniske detaljer
- `CreateManualOrderDialog.tsx`: `BuilderItem.quantity`; `calcItemTotal` udvides og flyttes til `src/lib/order-item-total.ts` med vitest. Indsendelse sender `quantity`. Først verificeres serverens RPC-prisberegning (grundpris ved prisberegner, quantity ved fast pris).
- Undo via `toast-undo.ts`, der gemmer det fjernede `BuilderItem`.
- `ServicePicker.tsx`: filtrér selected som andre, `normalize()` for søgning, `<mark>`-fremhævning, resultattæller, kompakt intervalresumé, «Mest brugt» via count på `orders.service_id` (business-scoped), dynamisk grid (`lg:grid-cols-[1fr_16rem]` → `1fr_1fr`), tom-tilstand.
- Felter: `getSmartStep` fra `service-pricing.ts`, `NumberStepper` med direkte input og min/max-hint.
- Mobil: `Collapsible`-opsummering af valgte; accordion med én åben.

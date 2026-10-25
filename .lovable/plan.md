# Bedre app-mails, aftaledetaljer og fakturaer

## 1. App-mails (kunder og virksomheder)
- Priser vises i to linjer: først **uden moms**, derefter **med moms (25 %)**, både pr. service og i totalen. Gælder bl.a. ordrebekræftelse, manuel bestilling bekræftet/godkendelse, statusopdatering, abonnementsændring/-påmindelse, nye leads og virksomhedsbeskeder.
- Interval vises altid på dansk som rigtig tekst ("Hver 14. dag", "Månedlig", "Engangskøb", "Hvert 5. minut (test)") — aldrig rå værdier som `hver_14_dag` eller `weekly`.
- Mobilvenligt design: prislinjer stables på smalle skærme i stedet for at overlappe, lange servicenavne ombrydes, faste bredder fjernes, knapper fylder bredden på mobil. Havblå #016EA4 bevares.
- Gennemgang af alle skabeloner for indhold der ikke giver mening (tomme felter, manglende datoer, gentagelser) med pæne fallbacks.

## 2. Aftaledetaljer under "Aftaler"
- Når en aftale åbnes, vises en servicesektion pr. service: navn, kategori, interval på dansk, antal/enhed, prisberegnerfelter, pris uden og med moms, varenummer og beskrivelse.
- Viser også foreløbig opstartsdato og næste/seneste udførelse.

## 3. Fakturaer i e-conomic og Dinero
- Hver fakturalinje får en tydelig tekst: servicenavn, interval på dansk, opstartsdato og udførelsesdato, fx "Udvendig vinduespudsning — Hver 4. uge · Opstart 01.10.2026 · Udført 24.10.2026".
- Fakturaens bemærkning/overskrift får udførelsesdato og aftalenummer. Beløb og momsberegning ændres ikke (systemet tilføjer moms som i dag).

## Teknisk
- Ny fælles `formatServicePriceWithVat` i `_service-price.ts` (uden moms + med moms), og en fælles dansk intervalformatter i `_shared` der spejler `src/lib/interval.ts`; erstatter alle rå intervalvisninger i mails og regnskabslinjer.
- Mail-styles i `_styles.ts`: stablede pris-rækker, `word-break`, ingen faste kolonnebredder.
- `economic.ts`/`dinero.ts`: linjebeskrivelse bygges af én fælles hjælper; opstarts-/udførelsesdato hentes fra aftale/forekomst.
- Detaljevisning i `AftaleTab.tsx` udvides med servicesektion.
- Tests for intervalformattering, momsberegning (fx 100 kr → 125 kr) og fakturalinjetekst. Deploy af berørte mailfunktioner og regnskabsfunktioner; testmails sendes til william@adely.dk og kontrolleres ved 390 px.
- Hukommelsen om "Servicepriser uden moms" opdateres: mails viser nu både uden og med moms.

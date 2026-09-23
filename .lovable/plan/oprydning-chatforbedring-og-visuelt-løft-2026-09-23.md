# Oprydning, chatforbedring og visuelt løft

## Resultat

- Regnskabsfelter vises kun, når virksomheden faktisk har en aktiv regnskabsintegration — ikke blot fordi funktionen er med i abonnementet.
- Alle kunde- og virksomheds-chatvinduer åbner konsekvent ved den nyeste besked, også efter billeder og genåbning.
- “Drift hele forretningen fra ét sted.” får et mere kompakt og professionelt produktudtryk i Serviceyderes marine/teal-design.
- Testfase-striben og popup’en får bedre hierarki, tættere mobilopsætning, tydeligt rollevalg og ensartede knapper/fokus/kvittering.
- Kun dokumenteret ubrugt kode og databaseindhold fjernes; aktive drifts-, historik-, mail-, rute- og regnskabsdata bevares.

## Implementering

1. **Regnskabsintegration**
   - Tilføj én fælles kontrol for en aktiv række i `accounting_integrations`.
   - Brug den i kundeoprettelse/-redigering, kundeliste og kundedetaljer, så regnskabsstatus, faktureringsfelter, kundegrupper og regnskabsrelaterede dokumenter kun vises ved en reel aktiv forbindelse.
   - Bevar selve integrationssiden, så en virksomhed fortsat kan forbinde et program.

2. **Livechat og kundeservice**
   - Ensret start-i-bunden i platformens kundeservice, virksomhedens offentlige chat, virksomhedens indbakke og adminindbakken.
   - Vent på færdigt beskedlayout og billeder før første placering, men respekter derefter at brugeren selv kan scrolle op.
   - Bevar “hop til seneste”-adfærd ved nye beskeder.

3. **Offentligt design**
   - Forenkle den mørke forretningsflade: klar venstreside, kompakt driftsoversigt, bedre kontrast og tre mere ensartede funktionskort uden dekorative glødeeffekter.
   - Redesign testfase-popup’en direkte i det eksisterende designsystem: mindre tom plads, tydelig information, samlet formular, tilgængeligt segmentvalg og fuld mobiltilpasning.
   - Ensret den øverste testfase-stribe med popup’en.

4. **Kodeoprydning**
   - Fjern kun filer med nul importer og ingen route-, script-, konfigurations- eller edge-funktionsbrug.
   - Fjern de døde `quotes`-hooks sammen med den forældede tabel.
   - Fjern forældede UI-komponenter og kildefiler i mindre grupper, og kør typekontrol efter hver gruppe.
   - Bevar scripts og UI-byggesten, hvis der er tvivl om manuel eller fremtidig brug; ingen massefjernelse baseret alene på et værktøjsresultat.

5. **Databaseoprydning**
   - Fjern `quotes`, som er tom og erstattet af det aktive tilbudsforespørgselsflow.
   - Fjern `employee_invitations` og dens ubrugte opslagfunktion, som er tomme og erstattet af det aktive medarbejderflow.
   - Bevar alle store drifts- og historiktabeller. De er aktive og må ikke behandles som gammelt data.
   - Bevar tvivlsomme små konfigurationstabeller frem for at risikere datatab.

## Kontrol

- Test kundeoprettelse med og uden aktiv regnskabsintegration.
- Test åbning/genåbning og billedbeskeder i alle fire chatvisninger.
- Kontrollér testfase-popup og forretningssektion ved 390, 768, 1280 og bred desktop i lys/mørk tilstand.
- Kør typekontrol, relevante tests, databasekontrol og buildkontrol efter oprydningen.

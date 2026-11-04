# Plan: Mere professionel forside, der taler mere til virksomheder

Mål: Forsiden skal stadig hjælpe kunder med at finde en udbyder. Den skal også tydeligt vise virksomheder, at de kan oprette sig og bruge Serviceydere til at drive deres forretning, uden at gøre siden til en ren salgsside.

## 1. Tydeligt valg øverst
- Under søgefeltet: en diskret linje med to valg: "Søger du en udbyder?" (søgning) og "Driver du en servicevirksomhed? Opret din virksomhed gratis".
- Menuen øverst får en tydelig knap, "For virksomheder", ved siden af Log ind. Sammen med "Opret virksomhed" bliver det den eneste fremhævede knap.

## 2. Ny sektion: "Til virksomheder" længere oppe
- Flyt "For virksomheder" op lige efter "Sådan virker det", og gør den større.
- Tre kort med konkrete fordele: Ruteplanlægning og kalender, Fakturering med e-conomic/Dinero, App til medarbejdere med offline-tilstand og billeder som dokumentation.
- Et rigtigt skærmbillede af ruteplanlæggeren i en enkel ramme.
- Knapper: "Opret virksomhed gratis" og "Se hvordan det virker" (fører til guiderne).

## 3. Troværdighed
- En stribe med logoer for e-conomic, Dinero, Google og MitID, hvis de må vises.
- "Gratis flytning af dine data fra dit nuværende system", som også står i videomanuskriptet.
- Tal hentes kun fra rigtige data, fx antal brancher (55). Der opfindes ingen kundeantal.

## 4. Mere professionelt udtryk
- Ens afstand mellem sektionerne og ens bredde på indholdet.
- Færre forskellige knaptyper: én primær og én sekundær.
- Rolige overskrifter med samme størrelser og samme brug af etiketterne over dem.
- Udtalelser fra kunder vises kun med rigtige citater. Ellers skjules sektionen.
- Bundsektionen får to tydelige spor: "Find udbyder" og "Opret virksomhed".

## 5. Mobil og tablet
- Virksomhedsknappen skal være synlig i mobilmenuen, og alle trykflader skal være mindst 44 px.
- Vi tjekker forsiden ved 390 px, 768 px, 1024 px og 1280 px.

## Bevares uændret
Den helt hvide menu, den blå hero og det levende baggrundsbillede, dansk tekst, hastigheden, SEO-titler og SEO-strukturen.

## Spørgsmål, før vi går i gang
- Må logoer for e-conomic, Dinero og andre partnere vises?
- Har du rigtige kundeudtalelser og et skærmbillede, du foretrækker?

## Tekniske detaljer
- Filer: `HeroSection`, `SiteNav`, `ForBusinesses` (udvides), `Index.tsx` (rækkefølge), `CTABand`, `Testimonials`.
- Kun designtokens, ingen hardkodede farver. Den nye sektion bruger den eksisterende `DeferredSection` og `Reveal`.
- Visuelt tjek med Playwright i fire bredder og SEO-check bagefter.

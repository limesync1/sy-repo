
Mål: gøre “Tilføj til bestilling”-knapperne synlige og stabile på virksomheders servicesider, så de altid ligger tydeligt i bunden af hvert servicekort og ikke bliver klippet væk af layoutet.

1. Gennemgå og rette servicekortets højde-logik
- Fjerne den kombination af `h-full`, `overflow-hidden`, `flex-1` og `mt-auto`, der sandsynligvis får CTA-sektionen til at blive skubbet uden for det synlige område i `DynamicServiceCard.tsx`.
- Sikre at kortet bruger en mere robust struktur:
  - top: billede + serviceinfo
  - middle: konfiguration/prisfelter
  - bottom: fast CTA-blok med pris og “Tilføj til bestilling”
- Beholde knappen i bunden, men uden at den afhænger af en fejlbehæftet stræk-/fyld-logik.

2. Gøre CTA-sektionen visuelt tydeligere
- Give bundsektionen en klar visuel adskillelse fra resten af kortet med bedre spacing, border-top eller separat baggrund.
- Forstørre kontrasten på knappen og sikre at den ikke drukner i accentfarver eller svage overlays.
- Sikre ensartet højde på CTA-området, så pris og knap altid fremstår som kortets primære handling.

3. Forbedre servicekortets brugervenlighed generelt
- Stramme indholdet i kortet op, så tilpasningsdelen ikke fylder unødigt meget.
- Begrænse tekstmængde og vertikal spacing, så brugeren hurtigere når ned til CTA’en.
- Justere prisvisning, badges og stepper-felter, så kortet føles mere overskueligt og professionelt.

4. Forbedre layoutet på virksomhedssiden omkring services
- Justere grid/gap/sektion-spacing i `DynamicBusinessPage.tsx`, så servicekortene får bedre rytme og ikke virker for tunge.
- Sikre at servicesektionen starter mere kompakt og tydeligt, så brugeren hurtigt ser handlingselementer.
- Beholde eksisterende indhold og struktur, men optimere præsentationen omkring kortene.

5. Gennemgå bestillingsmodulet for konsistens
- Finpudse `CartSheet.tsx`, så visuel stil og hierarki matcher de forbedrede servicekort.
- Beholde det gode UX-mønster fra varighed/tidsrum-felterne og bruge samme tydelighed i pris, planlægning og næste handling.
- Sikre at flowet fra “Tilføj til bestilling” til kurv føles mere sammenhængende.

6. Verificering efter ændringer
- Kontrollere at knappen er synlig på desktop i almindelige servicekort, også når:
  - servicen har billede
  - servicen ikke har billede
  - servicen er fast pris
  - servicen er timepris
  - servicen bruger prisberegner med flere steps
- Kontrollere at knappen stadig fungerer korrekt, viser “Tilføjet!”-feedback og lægger varen i bestillingen.
- Tjekke at kortene stadig ser rene ud på mindre skærmbredder.

Tekniske detaljer
- Primære filer:
  - `src/components/business/DynamicServiceCard.tsx`
  - `src/pages/DynamicBusinessPage.tsx`
  - `src/components/business/CartSheet.tsx`
- Forventet hovedrettelse:
  - omlægning af card-layout i stedet for kun kosmetiske tweaks
  - justering af height/overflow/flex-struktur, så CTA ikke kan blive skjult
- Designretning:
  - mere kompakt
  - tydeligere hierarki
  - stærkere kontrast
  - bund-CTA som fast, naturlig afslutning på hvert servicekort

Acceptkriterier
- “Tilføj til bestilling” er synlig i bunden af alle servicekort uden ekstra fejlscrol eller clipping.
- Knap og prisoverslag er de mest tydelige elementer nederst i kortet.
- Servicekortene føles enklere, mere professionelle og lettere at bruge.
- Bestillingsmodulet matcher den forbedrede UX visuelt og funktionelt.

# Rettelser til bestilling, rutestatus, live-position og forside

## Mål
Fjerne fire konkrete problemer: skjulte adresseforslag, forkert status på projicerede ruter, manglende aftalekontekst for live-positioner og svag kontrast/layout i virksomhedssektionen på forsiden.

## Ændringer
- **Adresseforslag i “Opret bestilling”**: Sørge for, at adressefeltets forslag ligger over de efterfølgende sektioner og ikke klippes af formularens kort eller rulningsområde. Samme rettelse skal gælde alle bestillingsflader, der bruger det fælles adressefelt.
- **Projiceret rutestatus**: Sikre, at en projiceret rute altid vises som planlagt/kommende, indtil den konkrete forekomst er kørt, og at teksten “Kørt” ikke arves fra basisruten i rutedetaljerne.
- **Live-position ved aftalen**: Koble aktive medarbejderpositioner til stoppets aktuelle aftale. Det relevante aftalekort får en grøn live-prik, som ved hover, fokus eller tryk viser medarbejdernes profilbillede, navn og cirka ankomsttid baseret på den første aktuelle positionsregistrering ved stoppet.
- **Forsidens virksomhedssektion**: Forbedre “Alt du skal bruge for at drive din servicevirksomhed” med tydeligere kontrast, mere samlet layout og synlige ikoner/tekster på sektionens baggrunde, stadig i sidens eksisterende marine/teal-design.

## Kvalitetstjek
- Teste adresseforslag med tastatur og mus i bestillingsvinduet.
- Teste en fremtidig projiceret rute og en faktisk færdig rute.
- Teste live-markering med én og flere medarbejdere samt uden aktiv position.
- Kontrollere forsidesektionen på mobil, tablet og computer i lys og mørk visning.
- Kontrollere bygning og relevante rutetests uden at publicere.

## Begrænsninger
- Ingen planlagte mødetider eller forventet opgavevarighed genindføres.
- Eksisterende privatlivsregler og udløb for live-positioner bevares.
- Ingen ændring af bestillingsdata eller rutens udførelseslogik ud over den forkerte projicerede statusvisning.

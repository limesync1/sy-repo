# Fjern planlagte opgavetider og bevar præcis tidsregistrering

## Mål
Virksomheds-, platformadmin- og medarbejderpanelet må ikke vise eller lade brugeren fastsætte forventet varighed eller møde-/udførelsestid for en opgave, aftale eller service. Medarbejderens faktiske daglige arbejdstid bevares og vises præcist i timer, minutter og sekunder.

## Ændringer

### 1. Services og bestillinger
- Fjern visninger og redigering af estimeret/servicebaseret varighed fra serviceoversigter, serviceformularer og anbefalinger baseret på tidligere udførelser.
- Fjern tidsrum og klokkeslæt fra oprettelse/redigering af bestillinger og aftaler.
- Bevar dato, prisstruktur og timebaseret fakturering, hvor “timer” er en prismængde og ikke en forventet udførelsesvarighed.

### 2. Aftaler, kunder og medarbejderadministration
- Vis kun dato på kommende aftaler og tildelte opgaver; fjern planlagt ankomst, afgang og klokkeslæt.
- Fjern opgavevarighed fra kort, tabeller, detaljer, historik, regnskabsdetaljer, notifikationstekster, print og eksport.
- Bevar systemhændelsers tidsstempler, beskedtider, påmindelser om interne leads og øvrige administrative logtider, fordi de ikke fastsætter medarbejderens fremmøde til en opgave.

### 3. Ruteplanlægning og rutekørsel
- Fjern tidslinjevisninger, tidsvinduer, planlagt ankomst, estimeret sluttid og servicevarighed fra ruteplanlæggerens sider, vinduer og mobilvisninger.
- Gør rækkefølge, stopantal, afstand og stopbaseret belastning til de synlige planlægningssignaler.
- Bevar live køretid og ETA i aktiv navigation, fordi det er aktuel rejseinformation og ikke et fastsat mødetidspunkt; den må ikke sammenlignes med en planlagt ankomst.
- Bevar interne kompatibilitetsfelter, hvor eksisterende rutealgoritmer kræver dem, men eksponér dem ikke i brugerfladen.

### 4. Medarbejderens faktiske tidsregistrering
- Bevar Start dag, Stop dag og registrering af faktisk arbejde.
- Vis løbende og afsluttet daglig arbejdstid som `timer : minutter : sekunder`, beregnet fra de faktiske start-/sluttidsstempler.
- Vis start og slut med sekundpræcision i tidsregistreringssammenhæng; de må ikke genbruges som planlagte opgavetider.
- Opdatér statistik til sekundpræcis faktisk arbejdstid uden at ændre historiske data.

### 5. Kontrol
- Søg hele panelkoden igen efter varigheds- og mødetidsfelter samt indirekte formatering.
- Kontrollér virksomhed, platformadmin og medarbejderpanel på mobil og computer.
- Test oprettelse af service/bestilling, aftaleoversigter, ruteplanlægning, rutekørsel og Start/Stop dag.
- Kør relevante tests og kontrollér, at projektet bygger uden fejl.

## Bevares
- Datoer for aftaler og ruter.
- Faktisk registreret arbejdstid og faktiske afslutningstidspunkter i tidsregistreringssammenhæng.
- Live navigationens afstand, køretid og ETA.
- System-, besked-, regnskabs- og revisionslogtider.
- Eksisterende datafelter, hvor de stadig kræves internt; ændringen fokuserer på funktioner og synlige visninger.

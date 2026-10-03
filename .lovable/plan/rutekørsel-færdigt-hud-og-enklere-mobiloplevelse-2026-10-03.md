# Rutekørsel: færdigt HUD og enklere mobiloplevelse

## Hvad gennemgangen allerede viser
- Ruten sender automatisk medarbejderen væk efter otte sekunder, når sidste stop er udført.
- “Kørt” er i dag tiden siden rutestart, også når medarbejderen arbejder hos kunden. Det er ikke ren køretid.
- Mobilkontrollen viser defekte billeder i startvinduet. De nye ikoner skal repareres, ikke erstattes med gamle.
- Kortets kamera centrerer uden at tage højde for vejvisningen ovenover. Lav fart kan give for tæt zoom.
- Stopoplysninger står centreret som en ekstra linje, og bundpanelet mangler en vedvarende fortryd-handling.

## 1. Afslutning uden automatisk retur
- Fjern nedtællingen og alle automatiske returskift efter sidste udførte stop.
- Vis samme kompakte afslutningsoversigt i kørselsguide og tjekliste: udførte stop, køretid, registreret tid hos kunderne og rutens start/slut.
- Oversigten bliver stående, også ved genåbning. Medarbejderen forlader den kun via “Til dagens ruter”.
- Behold “Information” og “Fortryd udførsel” på afslutningsoversigten. Fortryd åbner den samme rute igen uden nyt kørselsnummer.
- Kald oversigten “Ruteoversigt”, når kun denne rute er afsluttet; “Dagens oversigt” kræver, at alle dagens aftaler er udført.

## 2. Tidsregistrering, der giver mening
- Brug ét fælles tidsgrundlag for guide, tjekliste og afslutningsoversigt.
- Hold “Start”, “Køretid”, “Ankomst” og “Tidsregistrering” venstrestillet og kompakt, uden gentagne tal.
- Køretid må ikke tælle registreret arbejde hos kunden med. Skeln mellem registreret transport og et estimat; manglende data vises som “Ikke registreret”, ikke som opdigtede minutter.
- Frys sluttid ved sidste udførelse, og genoptag tidsforløbet korrekt ved fortryd.
- Vis faktisk registreret ankomst, når den findes, ellers tydeligt forventet ankomst. Samme værdi vises i begge visninger.
- Hvis tidsregistrering ikke kan gemmes, vis en konkret fejl frem for at lade som om alt blev gemt.

## 3. Mere kort, mindre støj
- Dæmp nærzoom, mens fartstilpasset zoom og rolige skift bevares.
- Placér positionen i kortets frie område under vejvisningen. Tilpas placeringen til skærmhøjde, fejlbeskeder og parkeringsvisning.
- Gør vejvisningen mindre: én tydelig manøvre, afstand og vejnavn; næste sving kun når relevant.
- Undgå overlap mellem manøvre, trafik, genberegning og GPS-fejl. Lange vejledninger skal kunne læses helt.
- Behold automatisk kortfølgning uden at genindføre de tre fjernede zoom-/centreringsknapper.

## 4. Tydelige handlinger og stopprikker
- I kørselsguiden fortsætter vejvisningen automatisk mod næste stop. Fjern “Kør dertil”, hvor den ikke udfører en meningsfuld handling.
- I tjeklisten hedder skiftet “Vis vej på kort” og åbner guiden ved det relevante stop.
- Ved kunden vises dørkode, vigtige noter og “Start aftale”; under arbejde vises tidsregistrering og “Markér udført”.
- Tilføj synlig “Fortryd udførsel” direkte ved “Information” nederst, når der er et udført stop at fortryde. Vis hvilket stop handlingen gælder.
- Stopprikker åbner en lille, venstrestillet oplysning forankret ved tidslinjen med stopnummer, navn og udført-/ankomsttid. Ingen frit svævende tekst midt på kortet.
- Bevar den svage, langsomme puls og tilstrækkelig trykflade. Mange stop må ikke skabe overlap.

## 5. Mørk tilstand og fælles vinduer
- Gennemgå lys/mørk tilstand på topbjælke, vejvisning, parkering, tidslinje, knapper, tjekliste, afslutning, stopvindue og øvrige åbne vinduer.
- Ensret flader, tekst, kanter og tryktilstande med appens farver. Ingen hvide glimt fra vinduer i natvisning.
- Automatisk dag/nat og manuel ændring skal gælde ens på tværs af guide og tjekliste; manuel ændring ophører ved næste automatiske skift.
- Reparér de nye ikoners indlæsning, og bevar ruteplanlæggerens fælles vinduesdesign.

## 6. Kontrol før arbejdet kaldes færdigt
- Mobilkontrol på mindst 393 × 852 og en mindre skærm samt kontrol på computer.
- Afprøv start, guide/tjekliste-skift, lydknap, dag/nat, alle stop, Information, telefonlink, stoprækkefølge, start arbejde, udfør, fortryd og afslutning.
- På isolerede testdata: udfør → fortryd → udfør igen. Kontrollér samme kørselsnummer og præcis én korrekt indtjening; læs resultatet tilbage i visningen.
- Sammenhold start, køretid og ankomst i guide og tjekliste. Kontrollér at afslutning bliver stående længere end den gamle nedtælling.
- Test afvist placering, svagt/forældet GPS, manglende kort/adresser, forbindelsesfejl og fejl ved lagring.
- Vis mobilbilleder af guide, parkering, mørk tjekliste og afslutningsoversigt.
- Fysisk bilkørsel og hørbar lyd på din telefon kan ikke udføres herfra. Simuleret GPS og lydudløsning testes særskilt uden at kalde det en rigtig køretur.

## Tekniske rammer
- Del tidsberegning og afslutningsoversigt mellem guide og tjekliste; brug eksisterende tidsregistrering som autoritativ kilde.
- Brug ét kortkamera med skærmbevidst fokus og eksisterende zoom-hysterese, ikke konkurrerende animationer.
- Afgræns mørke farver til kørselsoplevelsen og dens vinduer, så andre paneler ikke ændres.
- Test ikke ved at ændre kundernes eksisterende stop. Brug midlertidige testdata og fjern dem efter verificering.
- Ingen ekstra SMS-funktioner, kortudbyderskift eller ændringer af øvrige panelsider i denne opgave.
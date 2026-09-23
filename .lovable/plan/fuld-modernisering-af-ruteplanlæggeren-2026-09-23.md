# Fuld modernisering af ruteplanlæggeren

## Resultat
Ruteplanlæggeren bliver et kompakt, professionelt arbejdsbord i marine, neutrale flader og sparsom teal. Desktop og mobil får samme arbejdsgange og data; mobil bruger faner, bundpaneler og fuldskærmsvisninger i stedet for at skjule funktioner.

## 1. Bestillinger kræver en aktiv service
- Indfør én fælles kontrol af virksomhedens aktive services.
- Blokér alle manuelle indgange til **Opret bestilling** i ruteplanlæggeren, kundelisten og aftalefanen, hvis virksomheden ikke har en aktiv service.
- Vis en konkret tom tilstand med knap til at oprette/aktivere en service.
- Kontrollér igen ved afsendelse, så direkte eller allerede åbne dialoger ikke kan omgå kravet.
- Skjul inaktive services fra offentlige virksomhedssider og kurven.

## 2. Nyt fælles designsprog
- Stram hele planlæggeren op med 32–36 px kontroller, 4–6 px radius, tynde skillelinjer, færre badges og ens typografisk hierarki.
- Saml fælles stilarter for rutekort, aftalekort, værktøjslinjer, popovers, dialoger, sidepaneler, tomme tilstande og bekræftelser.
- Standardisér alle modaler og paneler med ens overskrift, scrollområde og fast handlingslinje.
- Behold rute- og statusfarver som funktionelle signaler; teal bruges kun til aktive valg og primære handlinger.
- Fjern rå specialfarver, tunge skygger, store runde chips og visuel støj.

## 3. Desktop-arbejdsbord
- Gør **Aftaler uden rute** bred nok til altid at vise søgning, filtre, gruppering, valg og tildeling uden manuel udvidelse.
- Saml alle pool-handlinger i en fast, kompakt værktøjslinje, som tilpasser sig bredden uden at skjule vigtige handlinger.
- Gør rutekort væsentligt højere og mere informative: navn, medarbejder, stopantal, afstand og flere synlige stop før klik.
- Gør rutehandlinger konsekvente og altid tilgængelige via en kompakt handlingslinje eller menu.
- Forbedr kalenderceller, kortvisning, dagpanel, stopdetaljer, fejltilstande og drag-feedback i samme stil.

## 4. Belastning beregnes på stop – ikke tid
- Fjern synlig **Arbejdstid**, servicevarighed, arbejdsminutter og timebaseret **Dagens belastning** fra hele planlæggeren, dagvisning, ugeoverblik, print og relevante popups.
- Behold rejsetid/ankomsttid, hvor det beskriver selve kørslen; det må ikke bruges som servicebelastning.
- Beregn belastning ud fra antal stop pr. aktiv medarbejder. Udgangspunkt: 8 stop pr. medarbejder pr. dag; travl ved 90 %, overbelastet over 100 %.
- Vis fx **7 af 8 stop** og brug samme beregning i kalender, overblik, konfliktadvarsler, næste ledige dag og flytning af aftaler.
- Behold interne varigheder til optimeringsmotoren, men vis dem ikke som arbejdsbelastning.

## 5. Samme funktioner på mobil og computer
- Mobil får visningsskift mellem dag, uge og kort samt adgang til søgning, filtre, gruppering, bulkvalg og tildeling.
- Mobil får de centrale desktophandlinger: ny rute, opret bestilling, optimér, flyt dato, redigér rute, historik, konflikter, sygemelding, flet/flyt ruter og fortryd relevante sletninger.
- Kortet åbner i en brugbar fuldskærmsvisning med stoprækkefølge og den aktuelle optimerede rute.
- Touch-flow bruger tydelige knapper og bundpaneler; træk-og-slip er et supplement, aldrig den eneste metode.
- Tablet får et stabilt todelt arbejdsbord; telefon får faner mellem **Ruter**, **Uden rute** og **Kort** uden tab af funktionalitet.

## 6. Kontrol og test
- Tilføj tests for servicekravet, stopbaseret belastning og desktop/mobil funktionsparitet.
- Test tom, normal, travl og overbelastet dag samt smalle og brede panelbredder.
- Gennemgå alle dialoger, popups og paneler på desktop, tablet og 390 px mobil.
- Kontrollér at de vigtigste flows virker: opret bestilling, opret rute, tildel/flyt stop, optimér, vis kort, åbn dagdetaljer og fortryd sletning.

## Tekniske detaljer
- Genbrug eksisterende data og handlinger; der oprettes ikke en separat mobil-logik, hvor samme handling allerede findes.
- Stopkapacitet beregnes fra kalenderens stop og aktive medarbejdere, så timebaseret kapacitetsdata ikke styrer brugerfladen.
- Ændringen berører kun ruteplanlægning, ordreindgange og offentlig filtrering af inaktive services; optimeringsmotorens interne tidsdata bevares.

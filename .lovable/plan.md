# Visuel omlægning af ruteplanlæggeren

## Resultat
Ruteplanlæggeren bliver et tæt, roligt arbejdsredskab med fast kø af aftaler til venstre og kalender/kort som hovedområde. Samme funktioner bevares på computer, tablet og mobil, men præsenteres efter skærmens plads.

## 1. Fælles professionelt designsprog
- Brug lyse arbejdsflader, mørk marine tekst, diskrete grå skillelinjer og teal kun til aktive valg og primære handlinger.
- Standardisér typografi, 32–36 px kontroller, 4–6 px hjørner og korte overgange uden hoppende kort eller dekorative effekter.
- Giv værktøjslinjer, kort, tomme tilstande, fejl, popovers, sidepaneler og alle modaler samme tætte opbygning.

## 2. Fast arbejdsbord på computer
- Fast venstre panel til **Aftaler uden rute**, bredt nok til at søgning, filtre, valg og handlinger altid er synlige.
- Saml datovalg, måned/uge, filtre og hovedhandlinger i én overskuelig kommandolinje uden skjulte vigtige funktioner.
- Gør rutekort højere og mere informative før åbning: medarbejder, antal stop, afstand, status og flere stop i rækkefølge.
- Stram kalenderceller og dagsdetaljer op med ens linjeføring, tydelig stopkapacitet og færre badges.

## 3. Mobil og tablet med samme funktioner
- Tablet får et stabilt todelt arbejdsbord, når pladsen tillader det.
- Telefon får en fast, kompakt kommandolinje og tydelige visninger for **Ruter**, **Uden rute** og **Kort**.
- Søgning, filtre, bulkvalg, tildeling, opret bestilling, opret/optimér/flyt rute, historik og konflikter forbliver tilgængelige.
- Paneler og modaler bruger hele den brugbare skærm med fast overskrift og handlingslinje; intet må løbe vandret ud.

## 4. Ensartede kort, paneler og dialoger
- Omlæg aftalekort, rutekort, dagpanel, stopdetaljer, kortvisning, print, sygemelding, historik, konflikter, flyt/flet og bekræftelser i samme stil.
- Vis kortets vigtigste handlinger direkte; sekundære handlinger samles i en tydelig menu.
- Brug knapper og ikoner med klare labels/tooltips, og sørg for brugbare touch-flader på mobil.

## 5. Stopbaseret belastning og servicekrav
- Fjern resterende synlig arbejdstid, servicevarighed og tidsbaseret belastning fra planlæggerens sider og popups.
- Vis kapacitet som fx **7 af 8 stop**, også i **Næste ledige**, kalender og dagdetaljer.
- Blokér alle indgange til **Opret bestilling**, før dialogen åbner, hvis virksomheden ikke har en aktiv service; behold kontrollen ved afsendelse.

## 6. Kontrol
- Test opret bestilling, tildeling/flytning, ruteåbning, optimering, kort, dagdetaljer og dialoger.
- Kontrollér visuelt ved 1305 px computer, 768 px tablet og 375 px telefon med realistiske data.
- Kontrollér at handlinger er synlige, tekster ikke overlapper, og at belastning overalt beregnes ud fra antal stop.

## Tekniske detaljer
- Genbrug den fælles planlægger og eksisterende handlinger; ingen ny separat mobil-logik.
- Saml gentagne stilregler i planlæggerens eksisterende designhjælpere og komponenter.
- Behold interne tidsdata alene til ruteoptimering og køreberegning; de vises ikke som servicebelastning.

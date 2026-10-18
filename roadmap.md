## Kreditnota ved annullering under Aftaler
- [ ] Tilføj relevant kreditnotavalg og test at kreditering sker før annullering

## Profilredigering
- [x] Ret fejlen ved manglende kontoprofil; 3 tests bestået, gemning og genåbning efter genindlæsning kontrolleret indlogget

## Fakturamails, annullering og timeinterval
- [x] Ret Gensend faktura (afsendelse accepteret) og tilføj kreditnota-mail med privat PDF-link
- [ ] Bekræft kreditnota-mail hos modtageren — indbakken er ikke tilgængelig i testmiljøet
- [x] Tilføj medarbejderannullering med kreditnotavalg og serverkontrol; uvedkommende stop afvises
- [ ] Bekræft annullering som tildelt medarbejder — testsessionen er virksomhedsejer
- [x] Tilføj fjernbart timeinterval og isoleret servergentagelse med almindelig regnskabskø
- [ ] Bekræft en hel times gentagelse og regnskabsmodtagelse — kræver forløbet af en faktisk testtime

## Servicepriser og tom virksomhedsside
- [x] Vis servicepriser som uden moms ved oprettelse, bestilling og i servicemails; mailfunktioner opdateret
- [x] Brug vedhæftet ikon ved Ingen services oprettet endnu
- [x] Kontrollér uændrede prisbeløb (10 tests), offentlig prisvisning og indloggede prisfelter
- [ ] Visuel kontrol af tom virksomhedsside med ikonet — ingen tilgængelig tom virksomhed i testmiljøet

## Rutekørsel: småfejl og roligere kort (10/10)
- [x] Forenkle ankomsthandlinger og forkorte sikker ankomstregistrering
- [ ] Bekræft rækkefølgeændring på den aktuelle rute — testsession har ikke adgang; flytning forenklet og hente-fejl giver Prøv igen
- [x] Fjern konkurrerende navigationslinjer og ryd op i ruteoverblik
- [x] Brug vedhæftet bil i kortvisninger og undgå unødige opdateringer
- [x] Kontrollér målrettede tests og aktuelle fejl — 37 tests bestod
- [ ] Visuel kontrol af Google-kort, navne og ruteoverblik — kræver brugerens autoriserede domæne

## Aktuel samlet forbedring
- [x] Gør Centrér og kørselsknapper mere kompakte; isoleret layoutkontrol på mobil/tablet/computer og knaptest
- [ ] Kontrollér kompakt HUD under reel rutekørsel — egen testsession har ingen tilgængelige ruter
- [x] Fjern Kortinfo og stabilisér responsiv HUD/kort
- [x] Færdiggør responsiv HUD på tablet/computer og robust Advanced Marker-håndtering
- [x] Ensret stophandlingerne i tjekliste, rutekørsel og aftaledetaljer uden skjulte dubletter
- [x] Gør Ret aftale, Ny aftale og Note trinvise og ens med fælles overlay-primitiver
- [x] Ensret Føj til rute og Flyt dato helt med Rediger rute/Opret bestilling
- [x] Implementér eksplicit smart aftaleplacering: dagens rute, næste ruteforekomst, anden rute eller uden rute
- [x] Vis konsekvensen af Ret aftale for dette besøg og fremtidige besøg før gem
- [x] Gør tidsregistrering atomisk og uden gentagne konfliktdialoger
- [x] Saml aktiv timerstatus på tværs af HUD, tjekliste og detaljeark
- [x] Ensret Note til kontoret
- [x] Ensret medarbejderprofil og tilføj virksomhedsprofil
- [x] Ret offentlig mobilmenus dubletter, pressed/focus/active og tilgængelighed
- [ ] Integrationstests med reel aftalelogik/profiler/HUD/timer — afventer testsession med adgang til arbejdsplads og ruter
- [ ] Test centrale rolleflows på mobil/tablet/computer — afventer testsession med adgang til arbejdsplads og ruter
- [x] Fjern aktuelle runtime-advarsler i aftaledetaljer

## Responsivitet og synlighed
- [x] Ret fælles knapper, vinduer, bundark, dropdowns og popups centralt
- [x] Ret aftalevinduer og kompakte stophandlinger på alle bredder
- [x] Ensret Føj til rute og Flyt dato med de fælles vinduesprimitiver
- [x] Kontrollér rutekørsels-HUD uden overlap på mobil, tablet og computer
- [x] Test lyst/mørkt tema, lange tekster, scroll og fejltilstande

## Overblik, profil og aftalehandlinger
- [x] Giv heroens nøgletalskort en lys sølv-gradient med mørk variant
- [x] Fjern dobbeltikonet ved Udført og ensret overblikkets kort/handlingstilstande
- [x] Saml virksomhedens og medarbejderens Rediger profil i samme vindueslayout
- [x] Giv Ret aftale, Ny aftale og Note til kontoret tydelige semantiske farver
- [x] Fjern konkurrerende notehandling i aftaledetaljerne og ensret teksten
- [x] Verificér indlogget på mobil, tablet og computer i lyst/mørkt tema
- [x] Tilføj og kør målrettede komponenttests samt kontrollér fejl- og konsollog
- [x] Placer Ret aftale og Ny aftale øverst i opgavedetaljens modal med notathistorik nederst

## Rute og mørk tilstand (10/10)
- [x] Tilføj Bauhaus Herning og jem & fix Herning som kunder og sidste stop på Haderup–Herning
- [x] Fjern hvid sidebaggrund i mørk tilstand (ses ved scroll)
- [x] Centrér/positionér lander direkte på bilen; ingen "spoling" efter app-skift
- [x] Fortryd udførsel sletter også aftalens tidsregistrering
- [x] Optimér dagen: hurtigste rækkefølge for alle dagens ruter med køretid pr. medarbejder

## Stabil bil og kørselstest (10/10)
- [x] Positionsmotor: vejmatchning, hysterese, afvisning af spring, tunnel, stillestående
- [x] Jævnt kamera og bil fra samme sample (Google og reservekort)
- [x] Rutelinjen hentes ikke længere hver 120 m
- [x] Simuleret Haderup–Herning med afvigelsesrapport; forkerte stopplaceringer rettet
- [x] «Optag kørsel» og «Se optagelse» under Alle stop (slettes efter 14 dage)
- [ ] Rigtig kørsel med optagelse på telefonen (kræver at du kører)

## Bysider (plan 16. okt.)
- [x] Bølge 1: alle eksisterende brancher i 18 byer
- [x] Bølge 2: elektriker, VVS, tømrer, murer, kloakmester, skadedyr i 18 byer + /by-hubs
- [x] Bølge 3: sidste 8 brancher + 16 forstæder/mindre byer (fremrykket efter brugerens ønske)
- [ ] Bølge 4: 16 mellemstore byer (Viborg, Fredericia …) — venter på indeksering i Search Console (ca. 6.–13. nov.)

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
- [ ] Tilføj de lovede integrationstests for aftalelogik, profiler, navigation, HUD og timer
- [ ] Test de centrale flows som relevante roller på mobil, tablet og computer i lyst/mørkt tema samt fejltilstande
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

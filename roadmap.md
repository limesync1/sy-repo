## Forsidens design (20. oktober)
- [ ] Forbedr blå WebGL-flader, sektionsrytme, kort og animationer uden ændring af indhold/priser
- [ ] Kontrollér hele forsiden, bevægelse og reduceret bevægelse på mobil/computer

## Aftalepuljens vinduer (20. oktober)
- [x] Ret Tilføj aftale til rute og Flyt opstartsdato med fælles bredde, ny vinduestop og mobilvenlig forhåndsvisning
- [x] Isoleret browserkontrol ved 1351/768/390/320 px i lyst/mørkt tema: rutevalg, datoforskydning og kalender; fire tests bestået. Reel gemning ikke testet: egen konto har ingen virksomhed.

## Ruteplanlæggerens vinduer (19. oktober)
- [x] Ensret optimering, sygemelding, tastaturgenveje og dagsoversigter med profilvinduets store frie ikoner; genskab optimeringsknappers oprindelige ikoner
- [x] Ret printvinduets overlap og gennemgå sygemeldingens trin, rulning og knaplinje; behold gemmelogikken
- [x] Kontrollér indlogget ved 1351/390/320 px i lyst/mørkt tema; 8 tests bestået, build OK. Sygemelding frem til bekræftelse uden gemning. Ruteoptimeringens resultatvindue kontrolleret isoleret uden virkelig optimering; printknapper overlapper ikke.

## Kompakte oprettelsesvinduer
- [x] Ensret Opret rute og Opret kunde med Opret bestilling uden ændringer i gemning eller aftalelogik
- [x] Kontrollér vinduer, udfoldelige felter og knaplinjer ved 390/1351 px i lyst og mørkt tema med virksomhedssession; ingen vandret overlap eller sidefejl, testdata ikke gemt

## Automatisk oprettelse efter timeinterval
- [x] Undersøg beskeden: aktiv timegentagelse forfalder 19. oktober kl. 01:10:06 dansk tid; aktiv automatisk kontrol kører hvert femte minut, så næste kontrol er kl. 01:15. Ingen bekræftet fejl eller ændringer i aftalerne; faktisk næste oprettelse er endnu ikke verificeret.

## Demosiden fjernet
- [x] Slet /demo, demo-data og kurv-/chat-undtagelser; gamle /demo-links sendes til /virksomheder og er bekræftet i browser

## SEO-fund (18. oktober)
- [x] Kontrollér og ret demoens overskrift samt forsidens HowTo/FAQ-data
- [x] Kontrollér og forbedr haveguidens søgetekst uden nye faktapåstande; samme metadata i register og side
- [x] Verificér tre offentlige sider i browser, seks SEO-tests og build OK; fund registreres til næste scanning

## Mobil ruteplanlægning og navigation
- [x] Faste ruter øverst på dagen: rækkefølgen anvendes i både måned/uge-kalenderen og mobilagendaen; bekræftet med test, database-data og skærmbillede
- [x] Gennemgå aftalekortenes afstande, tekstombrydning og handlinger i pulje, rutevindue og dagsoversigt; 10 tests bestået, isoleret kontrol ved 320/390/768/1100/1280 px i lys/mørk visning med lange navne og intervaller; arbejdspladsflow afventer adgang
- [x] Ensret aftale- og rutekort på mobil og i vinduer med computerens design; 9 tests bestået, isolerede kort og stopvindue kontrolleret ved 390/768/1280 px i lys/mørk visning uden dataændringer
- [x] Mobil dagsoversigt, dato-/periodevalg og synlige rutehandlinger; aftaler og gentagelser uændrede
- [x] Fælles bundnavigation, Mere-menu og sikker afstand til indhold i begge paneler
- [x] 14 tests bestået; isoleret kalender og navigation kontrolleret i browser ved 320/390/768 px og mørkt tema
- [ ] Kontrollér samlet flow på rigtig arbejdsplads — den indloggede egen konto har ingen virksomhed eller medarbejderadgang

## Kreditnota ved annullering under Aftaler
- [x] Tilføj relevant kreditnotavalg; 5 tests kontrollerer rækkefølge, fejl og fravalg. Spørgsmål og Fortryd kontrolleret på rigtig aftale uden at ændre den.

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

## Vinduer (plan 2026-10-18)
- [x] Fælles vinduesstandard: bundvindue på mobil, fast knaplinje, 44 px knapper, større tekst
- [ ] Gennemgå hvert vindue gruppevis med skærmbilleder — kræver testkonto med virksomhed (egen konto har ingen)

## Aftalernes gentagelser
- [x] Ret kørselsnumre og vis kun næste udførelse for den aktuelle aktive serie; kontrolleret mod faktiske data og seks tests uden at udføre aftaler
- [ ] Visuel kontrol af DK Renfyns aftaleliste — testsessionen har ingen virksomhedstilknytning

## Medarbejderannullering
- [x] Ret adgangstjek før begge kreditnotavalg; syv tests bestået, aktiv funktion deployet, indlogget afvisning af uvedkommende stop verificeret uden annullering
- [ ] Kontrollér faktisk annullering som tildelt medarbejder — kræver godkendt medarbejdersession og isoleret testaftale

## Nye opgaver (19. okt. 16:08)
- [x] Slet-rute-modal: nyt vedhæftede ikon + samme nye design som øvrige vinduer
- [x] Fjern «Opret bestilling»-knappen under «Alle aftaler er planlagt» i aftalepuljen
- [x] Browser-autofill udfylder «Søg navn eller adresse...» i Aftaler uden rute — spær feltet
- [x] Genindfør «Påmindelse før besøg» (e-mail + SMS): virksomhedsindstillinger, opret/rediger kunde, aftale-overrides, afsender
- [x] «Opret bestilling»: mere kompakte servicekort, tydeligere farvede knapper, datoknap nem at finde

## Tablet, kundeservice og Lighthouse (25. oktober)
- [ ] Ret konkrete tabletproblemer og gennemgå sektionernes tekst, ikoner og trykflader på fem offentlige sider
- [ ] Frigør online-markeringen på mobilens kundeserviceknap og kontrollér åbning/lukning
- [ ] Mål fem offentliggjorte sider med Lighthouse, prioritér konkrete hastighedsrettelser og kontrollér frisk SEO-scanning
- [ ] Test tablet/mobil/computer i begge temaer samt indlæsning og relevante tests; rapportér målebegrænsninger

## Ejerbeskeder ved tilmelding (25. oktober)
- [x] Fast ejermail ved ny virksomhed (begge selvbetjente oprettelsesveje + admin) og ny ventelistetilmelding; serververificerede virksomhedsdata og event-ID beskytter mod falske detaljer/dubletter
- [x] Fire funktioner deployet; fem tests bestået; reel ventelistetilmelding/bekræftelse og autoriseret virksomhedsbesked kontrolleret. To sends til william@adely.dk bekræftet i mailhistorik, gentaget tilmelding gav ingen ny mail. Midlertidig testalias fjernet; ingen falsk virksomhed oprettet. Indbakkelevering ikke verificeret; build OK.

## Baggrunde og tablet (25. oktober)
- [x] Computer/tablet bruger samme blå tokens som øvrige sektioner; WebGL vises først efter første tegnede frame og fader ind over en farvematchet reservebaggrund
- [x] Nærmeste forsidesektioner indlæses straks; fjernere monteres før visning. Tablet får mindre billedfelt, bred tilbudsformular og bedre plads på virksomhedskort
- [x] Ni tests bestået; fem sider kontrolleret ved 768/820/1024/1280 px uden overflow/runtimefejl; tablet i begge retninger, synlig WebGL-bevægelse og statisk reduceret bevægelse kontrolleret. Lys/mørk visning visuelt kontrolleret uden popupper; build OK. Produktionshastighed på fysiske tablets er ikke målt.

## Yderligere forbedringer (25. oktober)
- [x] Gør login roligere og tydeligere under afsendelse; lås felter under afsendelse, fokusér læsbare fejl, ryd adgangskode ved skift og placér mobilformular øverst
- [x] Begræns forsidens forindlæsning på langsomme forbindelser; beskyt ventevisninger mod blokeret browserlager og gentagne genindlæsninger
- [x] 24 tests bestået; fem offentlige sider ved 1280/390 px i begge temaer uden vandret overflow eller sidefejl; simuleret loginfejl, genåbnede felter og skift til oprettelse kontrolleret; build OK. Nye konti og modtagne e-maillinks er fortsat ikke end-to-end-verificeret; indbakkeadgang mangler.

## Offentligt design og indlæsning (24. oktober)
- [x] Tydeligere loginlabels, 16 px felter, større valgknapper og danske fejl; password nulstilles ved skift mellem login/oprettelse
- [x] Forsidesektioner forvarmes før montering; staggered forvarmning af fire offentlige sider respekterer sparedata/2G; blå baggrund bruger 30 Hz timer frem for hver skærmopdatering
- [x] Find services: kort-skeleton, korrekt netværksfejl/genforsøg, ingen kaskadeanimation, URL som eneste filterkilde; Få tilbud beholder sidetop under matching og har rolig ventevisning; Bliv udbyder har prisfejl/genforsøg; Systemets søgning og knapkontrast forbedret
- [x] 25 tests bestået; seks sider ved 1280/390 px, lys/mørk og reduceret bevægelse uden overflow/runtimefejl; alle forsidens sektioner/footer nået; Systemets søgning gennemført; faktiske loginfejl og simulerede netværks-/prisfejl med vellykkede genforsøg kontrolleret. Build OK. Ingen ny virksomhed eller tilbud afsendt; lokale indlæsningstal er ikke en måling af produktion på langsomt mobilnet.

## Login og konto-oprettelse (24. oktober)
- [x] Ret falsk oprettelsesbekræftelse ved eksisterende e-mail i begge offentlige oprettelsesforløb uden konto-opslag; virksomhedsoprettelse venter på bekræftelse
- [x] Saml danske fejlbeskeder, robust indsendelse og tydelig bekræftelse/genafsendelse med 60 sekunders ventetid
- [x] Ret nulstilling, session-race og destination efter login; behold eksisterende profiler; medarbejder-signup-link viser login frem for generisk kontooprettelse
- [x] 17 tests bestået; browserkontrol af eksisterende e-mail, forkert adgangskode, netværksfejl, ét glemt-kode-feltforløb, ugyldigt link, almindelig indlogget session uden recovery og administratorens destination. Build OK.
- [ ] Verificér fuld ny konto og nulstilling via modtaget e-mail — adgang til indbakke/bekræftelseslink er ikke tilgængelig; eksisterende konto og simuleret recovery er testet uden at ændre brugerens adgangskode.

## Rolig forside (22. oktober)
- [x] Ens 4:3-billedformat og stabil ramme uden størrelsesskift; hele originalmotiver bevaret med udvidet billedkant
- [x] Gennemgå alle forsidens sektioner; mere ens afstande, kompakte mobilkort og færre hoppende ikoner
- [x] 13 tests bestået; fem mobilfotos uden rammebevægelse; seks sektioner ved 390/768/1280/3573 px uden overflow eller sidefejl; WebGL og mørk visning kontrolleret

## Mobilbilleder og Google (22. oktober)
- [x] Vis fem fotos på mobil/tablet uden beskæring eller forvrængning med lette billedvarianter
- [x] Saml titler, beskrivelser, alternativtekst og stabile billedadresser; opdatér Google-billeddata og sitemap
- [x] 14 tests bestået; fem mobilskift, tablet/WebGL, skarpe 2x-fotos og reduceret bevægelse kontrolleret; Google bestemmer visningen efter publicering og indeksering

## Indlæsning og ventevisninger (22. oktober)
- [x] Optimér forsidens billeder: første foto fra 856 KB til 112 KB WebP; desktop-only billeder, næste foto hentes separat, ingen inaktiv polling
- [x] Gennemgå offentlige/panel-ventevisninger; ret mørk kontrast, bredder, filterombrydning, tabelflow, straksvisning på virksomhedens faner og Systemets footer; ingen WebGL i venteflader
- [x] Kontrollér billedskift og reduceret bevægelse; 16 tests bestået, offentlige sider uden overflow, fælles ventevisninger isoleret ved 320/390/1280 px i begge temaer; build OK. Alle indloggede sider er ikke gennemtestet med reelle data.

## Forsidens billed-SEO og overgang (22. oktober)
- [x] Gennemgå forsidens SEO, billedbeskrivelser og ens metadata uden ændring af sitemapmekanismen; frisk grundscanning har 9 beståede kontroller
- [x] Erstat kantovergangen med rolig WebGL-overgang uden dobbeltbilleder; WebGL, fallback og reduceret bevægelse verificeret
- [x] Kør SEO-tests og kontrollér billeder/overgang i browseren; 8 tests bestået, 5 billeddataobjekter, korrekt canonical og ingen mobil-overflow
- [x] Gør overgangen blødere: langsom bølge, smal sløret fold med bevægelsesslør, ingen hård kant eller tom baggrund; browserkontrol i frames, build OK


## Offentlig computernavigation og hjemmeside (20. oktober)
- [x] Finpuds navigation med afgrænsede publikumsgrupper, animeret sidemarkering, samlet panelknap, kontooversigt og tydeligt valgt panel. Verificeret ved 1024/1280/3233 px, kontomenu i begge temaer, faktisk log ud, sidelinks samt mobilens Tab/Escape uden overflow eller sidefejl; build OK.
- [x] Tydelige kunde-/virksomhedsgrupper, kompakte kontohandlinger og stabil menu ved skift af skærmbredde
- [x] Ret branchekortenes uens destinationer, dobbelte klikmål i forsidens knapper og menufokus uden ændring af priser/bestillingslogik
- [x] Browserkontrol ved 1024/1280/3233 px, indlogget kontomenu i begge temaer, faktisk log ud, Systemet og branchevalg; forside ved 1280/390 px i begge temaer uden overflow. Menufokus og Escape verificeret; build OK.

## Resterende hastighed i virksomhedspanelets vinduer (20. oktober)
- [x] Isolér kundevinduets åbn/luk fra kundelisten og hent bestillingsvinduer kun ved brug
- [x] Bevar kundeoplysninger gennem lukkeanimation; tre tests bestået for isoleret state, forudfyldning og profilramme. Kundevinduets indtastning/lukning/genåbning kontrolleret isoleret ved 1280/390 px i lys/mørk visning.
- [ ] Mål samlet hastighed på rigtig virksomhed — egen konto åbner onboarding uden virksomhedstilknytning. To ældre overlay-tests forventer det tidligere mobil-layout; ikke ændret i denne opgave.

## Blå baggrunde på undersider og login (20. oktober)
- [x] Udvid læsbare blå animationer til fælles sidetoppe, mørke sektioner, afslutninger, login og ny adgangskode; behold loginregler
- [x] Browserkontrol ved 1280/390 px: undersider, loginvalg, glemt kode, kontaktområder og reduceret bevægelse; ingen sidefejl eller vandret overflow. Loginindsendelse uændret og ikke gentestet.

## Forsidens design (20. oktober)
- [x] Forbedr blå WebGL-flader, sektionsrytme, kort og animationer uden ændring af indhold/priser
- [x] Kontrollér alle fire blå sektioner ved 1280/390 px i lys/mørk visning; ingen overflow eller sidefejl. Synlig animation og statisk reduceret bevægelse målt; Find services gennemført. Build OK.

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

## Hastighed og guide (20. okt.)
- [x] Alle vinduer: lettere baggrund (ingen sløring) og kortere åbne/lukke-animation
- [x] «Opret bestilling» på Aftaler åbner/lukker uden at tegne hele siden om
- [x] Forsiden: blå baggrund starter efter første visning, lavere opløsning/30 fps, sektioner hentes i forvejen
- [x] Ruteplanlægger-guide (PDF + guide i appen) opdateret og nyt design

## Overblik (20. okt. 18:20)
- [x] Handlingskortet «Svar på aftaler»: tallet vises kun i badge, ikke dublet i label
- [x] Overblik: «bestilling/bestillinger» → «aftale/aftaler» overalt (insight, pille, lister, tomme tilstande, detaljepanel)
- [x] Overblik centreret med maks. bredde så rækker ikke strækkes på store skærme

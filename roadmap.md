# Roadmap

## Roligere WebGL
- [x] Fjern markørreaktion og skift striber til bløde, langsomme blå silkefolder
- [x] Kontrollér bevægelse, uændret markør og reservevisning på computer og mobil

## Blå forside og WebGL
- [x] Gendan udvalgte blå baggrunde med lyse mellemsektioner og tydelig ikonkontrast
- [x] Tilføj diskret WebGL med reduceret bevægelse og reservebaggrund
- [x] Kontrollér læsbarhed og bevægelse på computer og mobil

## Ikoner, visningsvalg og mørk rutekørsel 2026-10-08
- [x] Brug alle fem vedhæftede ikoner gennem det fælles register
- [x] Ret kompakte/fulde aftalekort og kalenderens tæthed
- [x] Ensret “Opret bestilling”
- [x] Ret mørke notifikationer og interaktive tilstande; afprøv indlogget og med regressionstests

## Nærmere mobilgennemgang 2026-10-08
- [ ] Kontrollér Min dag, ruter, Statistik/timer, arbejdspladsvalg og bestillingsvinduer indlogget på mobil/tablet
- [ ] Ret konkrete layout-, valg- og dialogproblemer uden at ændre tidsregistrering eller prisregler
- [ ] Kontrollér rutelistens og kortets fælles aftalehandlinger og fejlvisninger
- [ ] Kør målrettede tests og kontrollér aktuelle fejl

## Ikon ved "Tilføj aftale til rute" 2026-10-08
- [x] Upload det vedhæftede ikon og vis det gennem UiArtwork
- [x] Brug ikonet på aftalekort, bundbjælke, dialoghoved og bekræftelsesknap
- [x] Kontrollér ikonet indlogget i ruteplanlæggeren

Ikonet vises på "Vælg rute" på aftalekort, "Tilføj til rute" i bundbjælken, dialoghovedet "Tilføj X aftale(r) til rute" og bekræftelsesknappen, hvor det sidder i en hvid brik på den blå knap for at holde kontrasten. Typecheck ren. Fysisk telefon er ikke afprøvet.

## Mobilplanlægning og tydelig Min dag
- [x] Fjern Find den bedste rute uden at fjerne manuel rutetildeling
- [x] Ensret visningsrækkefølge, næste rute og låsning i Min dag
- [x] Forenkle Start dag/Start rute samt mobilhandlingers størrelse og farver
- [x] Kontrollér mobilplanlægning og Min dag indlogget med tests og skærmbilleder

Kontrolleret indlogget i responsive browserrammer 390×710 og 820×710: aktive ruter før udførte, starttid og rutenummer synlige, næste skridt viser rute og næste stop. Manuel rutetildeling har søgning og synlig bundhandling; optimeringsknapper og optimeringsprompter er fjernet. Kalenderens mobile rutekort kan scrolles uden trækaktivering; rækkefølge ændres med stoplistens pile. Ingen vandret overflow eller JavaScript-sidefejl i de afprøvede visninger. Fysiske telefoner og samtlige øvrige paneler er ikke gennemtestet.

## Ny Haderup–Herning-rute 2026-10-08
- [x] Opret Patricks rute i angivet rækkefølge med ti kundestop og Jem & Fix på Åvænget 4 som mål
- [x] Opret realistiske rengøringsydelser og tydeligt markerede testaftaler uden kundeudsendelser
- [x] Brug vedhæftet låseikon og ret småknappers linjehøjde
- [x] Kontrollér rutens stop, ydelser og låseikon i medarbejderpanelet

Verificeret indlogget som Patrick: 11 stop i korrekt rækkefølge i Min dag og Tjekliste, ydelsen læses tilbage i stop 10. Alle 12 adresser fundet via adresseopslag. Originalt PDF-ikon beskåret uden ændring af artwork; browseren bekræfter indlæst ikon. Smal 390×710 visning: stopvindue 374 px uden vandret overflow. Syv tests bestod; build OK. Fysisk bilkørsel er ikke afprøvet. Priser og kundedata er forslag/testdata, ikke virksomhedens godkendte prisliste.

## Rutevejr og mobilpaneler 2026-10-08
- [x] Beregn vejr på rutens stop og vis det i kalender og medarbejderpanel
- [x] Ret arbejdspladsvalg og vis alle rutestop; gennemgå centrale medarbejdervinduer
- [x] Ret mobil/tablet-ruteplanlægning med trykbaseret rækkefølge og tilgængelige aftale-/rutehandlinger
- [ ] Kontrollér indloggede sider og centrale vinduer på mobil/tablet samt regressionstests

Kontrolleret som Patrick på desktop og responsive 390×844/820×844 visninger: alle otte teststop kan åbnes, rutevejret viser 14°/4,9 mm/7,0 m/s, stoplisten har flyttepile, medarbejdervalg og rutetildeling åbner. Offline-flytning viser fejl og bevarer rækkefølgen. Tabletstatistik har ingen vandret overflow. Fysiske telefoner, alle øvrige virksomhedssider, samtlige modaler og fuld rutekørsel er endnu ikke gennemtestet.

## Felter uden automatisk mobilzoom
- [x] Ensret felter globalt på offentlige sider, i alle paneler og portalvinduer uden at deaktivere almindelig zoom
- [x] Kontrollér indtastning og 20 feltvarianter ved 390/767/768/1280 px samt større touchskærm; build OK. Fysisk iPhone er ikke afprøvet.

## SEO og header 2026-10-06
- [ ] Hold den offentlige header helt hvid ved scroll
- [ ] Gennemgå og ret fælles crawl-, metadata- og struktureret-datafejl
- [ ] Verificér SEO-kontroller og relevante offentlige sider

## Hjemmeskærmsapp og tydelig rutekørsel
- [x] Manifest og hjemmeskærmsikoner uden offline-cache; installation på telefon afventer
- [x] Fælles ankomst i tjekliste og guide, korte knaptekster
- [x] Arbejdskvittering med start, tider og indtjening fra samme kilde som statistik
- [x] Dæmpet vektorkort med tydelige veje og labels, reservekort og timeout
- [x] 41 regressionstests og mobilkontrol af natkort, fælles ETA, kvittering og printvalg; ingen browserfejl
- [ ] Udført/fortryd med stopnummer og beløb på isoleret testrute; ikke verificeret i denne ændring
- [ ] Fysisk bil- og lydtest — kræver brugerens telefon og bil

## Tydeligere rutekørsel i begge temaer
- [x] Fjern GPS-statuslinjer og oversæt hastegrad-filter
- [x] Ensret kontrast og handlingsfarver i guide, liste og stopvindue
- [x] Prioritér stopoplysninger og fold sekundære detaljer sammen
- [x] Kontrollér begge temaer og visninger på mobil og bred skærm med tests

## Rutekørsel: samlet HUD- og UX-forbedring
- [x] Vis samlet afslutningsoversigt og fjern automatisk retur
- [x] Ensret køretid, kundetid og ankomst i guide og tjekliste
- [x] Tilpas kortets zoom og synlige fokusområde til HUD
- [x] Ret mørk tilstand, stopvinduer, fejlbeskeder og defekte nye ikoner
- [x] Gør navigation automatisk og tilføj tydelig Fortryd udførsel ved Information
- [x] Vis stopoplysninger forankret ved tidslinjen uden at flytte kortet
- [x] Test guide, tjekliste, modaler, afslutning og fortryd på mobil med isolerede testdata; samme stop 1 og 272 kr. efter genudførsel, 33 tests bestået
- [ ] Fysisk kontrol i bil og hørbar lyd på telefon — kræver brugerens telefon og kørsel

## SEO-fund 2026-10-03
- [x] Ret Tilbuds fire trin til semantiske overskrifter uden visuelle ændringer
- [x] Kontrollér overskrifter i browseren og registrér rettelsen
- [x] Opdatér Haveguidens introduktion efter godkendelse; søgeteksten fremhæver allerede priser, lokale firmaer og tre tilbud

## Panelikoner og indlæsningsvisninger 2026-10-03
- [x] Opdatér ikonet for udførte aftaler og Indstillinger-headeren
- [x] Fjern kun Del profil fra Overblik-toppen
- [x] Gennemgå og ensret skeletons i virksomheds- og medarbejderpanelet
- [x] Kontrollér indlæsningsvisninger og panelændringer i browseren

## Aftalevinduer og nyt visningsikon
- [x] Fjern små prikker ved Næste handling og stopstatus i aftalevinduerne
- [x] Byg Kom godt i gang som ét panelvindue målt til skærmhøjden med det nye guide-ikon
- [ ] Kontrollér Kom godt i gang i browseren — testkontoen har ikke adgang til et virksomhedspanel
- [x] Ensret de faktiske aftalevinduer på Aftaler, Min dag og rutekørsel med samme header og vinduesflader
- [x] Brug det vedhæftede Visning af aftale-ikon i alle aftaledetaljer
- [x] Kontrollér Aftaler-vinduet og indlæst ikon på computer og mobil i browseren
- [ ] Kontrollér medarbejdervinduet under aktiv rutekørsel — Patrick Nissen har ingen ruter på den valgte dag

- [x] Redesign aftaledetaljer og deres åbne/lukke-flow på rutekort, liste og Statistik
- [x] Opdatér Medarbejdere-siden med ensartede handlinger, tooltips og nyt paneldesign
- [x] Færdiggør selvbetjent Meta-forbindelse med side/formularvalg, webhook-tilmelding og tydelige fejl
- [x] Tilføj serversidevalidering af hele Meta-flowet fra sidevalg til lead-oprettelse
- [x] Verificér frontend og backend med typekontrol
- [x] Opret /slet-data med anmodning om sletning af konto-, cookie-, privatlivs- og virksomhedsdata
- [x] Udskift kundeservice-ikonet med den vedhæftede fil
- [x] Forbedr Leads-siden med automatiske kundesvar om aftale, pris og status
- [x] Send en app-email til relevante valgte medarbejdere ved nye leads
- [x] Verificér funktionerne på mobil og desktop
- [x] Brug serviceydere.dk som fast Meta-returadresse og forklar Meta-domænefejl konkret
- [x] Forenkle Meta Lead Ads, forbedre kildevalg og ensrette Leads-statistik og indstillinger
- [x] Test-leads fra Facebook og Instagram i DK Renfyns indbakke
- [x] Egen indbakke pr. Facebook-side og Instagram-konto
- [x] Nye leads opretter automatisk en kunde med kontakt, dato og kilde
- [x] Meta-overblik: leads pr. kilde og hvor mange der bliver kunder
- [x] Felter i auto-svar: kundens navn, service, tidspunkt, by, pris, firmanavn
- [x] Ensartet lead-vindue og tidsvælger som Åbningstider
- [x] Bevar Leads-designet, men flyt indbakken op og gør næste skridt og Meta-sektioner mere kompakte
- [x] Brug de vedhæftede ikoner ved Profil, Beskeder og Konto på Indstillinger

## Plan 2026-10-02
- [x] Lead-knapper: Send som mail (rigtig afsendelse), Kopier, Gem udkast
- [x] Meta: "Hent seneste leads nu" + "Send test-lead"
- [ ] Meta: rigtige test-leads — venter på at brugeren forbinder Meta igen (forbindelsen står "Kræver handling")
- [~] Fuld gennemgang: runde 3 (opret-vinduer, valideringstekster, dansk "Luk"/"E-mail"). Mangler: indstillinger, regnskab, dataimport, rutekørsel
- [x] Brug de vedhæftede valgte-ikoner i headerens panelvælger for kunde, virksomhed, medarbejder og platformadmin
- [x] Opdatér søgning, kategori-pile, sektionslabels og sidepanelkontrol med de nye ikoner
- [x] Ensret Lead-indstillinger med panelvinduer og ret søgeikoner, labelstreg og tilbudstrin
## I gang
- [x] Udskift headerikoner med nye simple ikoner og passende kontrast
- [x] Gør labelstregen større og tydeligere
- [x] Bevar sektionernes oprindelige opdeling og struktur uden redesign

- [x] Dæmp kun de skarpe flerfarvede effekter i undersidernes topområder; bevar struktur og indhold
- [x] Forenkle rutefarver til to overskuelige rækker og forhindre arkiverede spøgelsesruter
- [x] Gør print af ruter overskueligt med dato/periode, indholdsvalg og detaljeret forhåndsvisning
- [x] Forenkle Min dag-rutekort og ensret Flyt rute til ny dato med Flyt aftaler
## Aftaler, rutetest og nye ikoner
- [x] Redesign aftaledetaljen som panelvindue
- [x] Udskift alle 26 brancheikoner gennem fælles register
- [x] Udskift matchende indholdsikoner uden at ændre virksomhedsnavigationen
- [x] Test fletning med rigtige, sikre testdata
- [x] Test medarbejderens fulde rutekørsel med rigtige testdata
- [x] Kontrollér mobil, desktop, runtime og build

- [x] Finjustér kun Aftaler visuelt mod ruteplanlæggeren uden strukturændringer

## Ny ikonpakke
- [x] Erstat de 59 tidligere indholdsikoner med filerne fra Nye-Ikon-Design
- [x] Ret fælles ikonregistre og direkte gamle ikonreferencer
- [x] Kontrollér ikoner på offentlige sider og i alle paneltyper
- [x] Ensret ikonstørrelser, indvendig luft, baggrunde og beskæring på tværs af sider og paneler

## Ikongennemgang og kortnavigation
- [x] Tilføj de 11 nye arbejdsdags-, statistik- og rutekørselsikoner
- [x] Ensret illustrationer i nøgletalsfelter og på Om os
- [x] Stop kortnavigationens endeløse koordinatventetilstand og tilføj genforsøg
- [x] Kontrollér centrale sider og rutekørsel på mobil og desktop

## Ruteplanlægger og panelikoner
- [x] Skjul Varighed og Planlagte tider i ruteplanlæggerens aftalevisning
- [x] Vis tydeligt rutedage og antal ruter i Print ruter-kalenderen
- [x] Fjern krydset fra ikonet ved Aftaler uden rute
- [x] Opdatér kundeserviceikonet med den vedhæftede version
- [x] Tilpas Profil-, Beskeder- og Konto-ikoner i virksomhedsindstillinger
- [x] Kontrollér ændringerne i virksomhedspanelet på desktop

## Ikoner, søgning og nyt Overblik
- [x] Tilpas Profil-, Beskeder- og Konto-ikoner samt kundeserviceikonet
- [x] Gennemgå ikonstørrelser på Om os, Tilbud, ruteplanlæggeren og begge paneler
- [x] Centrér søgeikonet og forstør forslagets ikoner uden ikonflader
- [x] Opdatér gamle blå sektioner til den nye brandblå
- [x] Forbedr virksomhedspanelets Overblik i det fælles paneldesign
- [x] Kontrollér desktop, mobil, runtime og build

## Samlet nyt design på hele Serviceydere
- [x] Fastlæg fælles farver, typografi og opbygning
- [x] Gennemgå offentlig hjemmeside og kundepanel
- [x] Gennemgå virksomheds- og medarbejderpaneler
- [x] Gennemgå app-e-mails og login-/konto-e-mails
- [x] Ensret fælles komponenter, tilstande, ikoner og handlinger
- [x] Kontrollér alle hovedvisninger på computer og mobil
- [x] Begræns arbejdet til små finjusteringer uden ændret struktur
- [x] Finjustér Overblik-toppen og giv Del profil den nye blå gradient

## Små ikon- og farvejusteringer
- [x] Gør nøgletalsikoner tydeligere i virksomheds- og medarbejderpanelerne
- [x] Forstør kundeserviceikonet og fjern ikonfladen ved Profil, Beskeder og Konto
- [x] Opdatér de to mørke forsidesektioner til den nye blå
- [x] Centrér og forstør ikonerne i servicesøgningen uden ekstra ikonflader
- [x] Gendan den nye ikonpakke på virksomhedens Overblik og kundeserviceknap
- [x] Kontrollér og forstør Overblik-, panelhandlings- og kundeserviceikoner

## Medarbejderpanel: sidste kontrol
- [x] Vis de nye ikoner til Vælg arbejdsplads og Genopstart dagen stabilt
- [x] Stop Statistik fra at blive hængende i indlæsning uden en medarbejderpost
- [x] Fjern referencefejl fra rutekørslens stopliste og aftaledetaljer
- [x] Kontrollér Min dag og Statistik i en rigtig indlogget visning
- [ ] Kontrollér print og kortkørsel med en aktiv rute — den valgte medarbejder har ingen tilgængelig rute

## Vinduer, onboarding og rutekort
- [x] Ensret Aftaler-detaljer med ruteplanlæggerens vinduesdesign
- [x] Brug samme stopdetaljevindue fra Min dag og aktiv rutekørsel
- [x] Tilpas Kom godt i gang til den synlige skærmhøjde uden sidescroll
- [x] Erstat det lukkede danske adresseopslag med loginbeskyttet Google Maps-geokodning
- [x] Afprøv Google Maps-adresseopslag med en dansk adresse og kontroller fælles stopvindue på computer
- [ ] Afprøv selve kortet på en aktiv medarbejderrute — testmedarbejderen har ingen rute eller stop
- [ ] Kontrollér virksomhedens Aftaler og Kom godt i gang i browseren — testkontoen har ikke adgang til et virksomhedspanel

## Tomme lister og serviceikoner
- [x] Ensret tomme lister i medarbejder- og kundepanelet med Ingen emner-ikonet
- [x] Brug fem vedhæftede ikoner i serviceoprettelse og -redigering
- [x] Kontrollér ikonvalg med 11 tests og tomme kunde-/medarbejdervisninger i browseren
- [ ] Kontrollér servicevinduer i browseren — den tilgængelige konto har ikke virksomhedsadgang

## Adresseforslag og rutekort 2026-10-03
- [x] Gendan fælles adresseforslag i bestilling, kunde og indstillinger med tydelige fejl; test fælles felt indlogget og som gæst
- [x] Brug vedhæftede Dagen afsluttet- og Genopstart dagen-ikoner
- [x] Gør rutekort, stopmarkører og kamerabevægelse rolige og tydelige
- [x] Opret testmedarbejderrute og afprøv adresser samt kort i indlogget visning; fjern midlertidig testrute efter testen
- [ ] Afprøv stabilitet under fysisk kørsel med enhedens GPS; browsertesten brugte fast simuleret position

## Fuld rutekontrol 2026-10-03
- [x] Test start, tre adresseopslag, kørsel, stophandlinger og afslutning med midlertidig indlogget testrute og simuleret GPS
- [x] Ret kameraryk, zoomuro og misvisende vejlinjer; brug enkle blå gradientlinjer og stopmarkører
- [x] Kontrollér computerflow: alle tre stop udført, gradientlinjer på alle strækninger og ingen JavaScript-runtimefejl; fjern midlertidige testdata
- [ ] Kontrollér adresse-/GPS-fejl og mobil under fysisk kørsel
- [ ] Fysisk GPS-kørsel kræver kontrol på brugerens telefon

## Mobilnavigation og rutetildeling
- [x] Fjern panelernes bundnavigation og den reserverede bundplads; bevar topmenuen
- [ ] Gør valg af aftaler og medarbejdere lettere på mobil
- [ ] Kontrollér mobilmenu og rutetildeling i browseren

## Medarbejdermobil og navigation 2026-10-03
- [x] Ensret mobilpanel, vinduer og trykflader
- [x] Ret kortrotation, ankomst og løbende vejvisning
- [x] Gør navigator og stopkontroller kompakte og neutrale; brug SVG-stopikoner
- [x] Kontrollér mobilflow, navigationstest og fejl

- Mobilkontrol: Min dag, Statistik, profilmenu, notifikationer og stopvindue; Livechat var ikke aktiveret for testmedarbejderen; 29 navigationstests bestod. Isoleret rute med to adresseopslag gennemført med simuleret GPS, testdata fjernet. Fysisk GPS-kørsel er fortsat ikke verificeret.

## Rutevalg, ankomst og ægte natkort
- [x] Forenkling af rutevalgsdialog med eksisterende ikoner
- [x] Fælles faktisk/beregnet ankomst i guide og tjekliste
- [x] Ægte natkort med tydelige veje og fejlhåndtering
- [ ] Isoleret fortryd-/indtjeningstest og mobilkontrol
- [ ] Fysisk biltest — kræver brugerens bil og telefon

## Stopvindue, stopprikker og medarbejdermobil
- [x] Tydelige dørkoder, bemærkninger og tidsregistrering i mørkt stopvindue
- [x] Statisk stopmarkering og stabil, trykstyret stopinformation
- [x] Mobilprint med adskilte printvalg og forhåndsvisning
- [x] Venstrestillet og kompakt Daglig aktivitet
- [x] Mobilkontrol af de fire visninger og deres handlinger

- Kontrolleret på 393×852 og 360×640: lange noter ruller fri af faste bundknapper; tidsregistreringsknap og stopvindueslukning fungerer; stopinformation forbliver stabil; printvalg og forhåndsvisning adskilt. 39 regressionstests bestod. Kørselskontrollen brugte læsebeskyttede testdata og simuleret GPS uden at ændre stopstatus eller indtjening i databasen.

## Medarbejder retter aftaler, havemand FAQ og mobilzoom 2026-10-08
- [x] Zoomkontrol på iPhone 14 og Pixel 7 (offentlige sider, virksomheds-, medarbejder-, kunde- og adminpanel + åbnede vinduer): ingen felter under 16px
- [x] Medarbejder kan rette ydelser (dette eller også kommende besøg) og sende note til kontoret
- [x] Noter vises under "Fra medarbejdere" i virksomhedens stopvindue
- [x] Havemand FAQ-side /guides/have/faq + sitemap; publiceret
- [x] Afprøv "Ret ydelser" på en rigtig rute med testmedarbejder

## Rutekørsel 100 m, noter i guiden og testrute 2026-10-08
- [x] Ca. 100 m fra adressen tæller som "hos kunden"
- [x] Tidsregistrering altid manuel; spørgsmål hvis en anden aftale stadig registrerer tid
- [x] "Note" synlig i kørselsguidens bundpanel
- [x] Testrute Patrick Nissen Haderup → Herning (7 aftaler + Jem & Fix, nabo-aftaler stop 2-3)
- [x] Ret ydelser afprøvet: antal gemt og besked vist for kontoret
- [ ] Kommende besøg på en fast aftale — testaftalerne er engangsbestillinger
- [ ] Jem & Fix' præcise adresse i Herning — afventer brugeren

## Ruteplanlægger: flere aftaler, ny bestilling og rene knapper 2026-10-08
- [x] Nyt "Mere info om aftalen"-ikon i aftaleoplysningernes overskrift
- [x] "Finder GPS-koordinater…" erstattet af forståelig tekst, blokerer ikke knapper
- [x] Ingen specialikoner inde i knapper i aftalepuljen
- [x] Træk et markeret kort → alle markerede aftaler følger med (dag = ny rute, rute = tilføj)
- [x] "Opret ny rute med X" i bjælken for valgte aftaler; pænere knaplayout
- [x] "Ny bestilling"-knap direkte i "Aftaler uden rute"
- [ ] Fysisk telefon ikke afprøvet

## Rutekørsel: synligt HUD ved fejl 2026-10-08
- [x] GPS- og forbindelsesadvarsler skjuler ikke længere dreje- eller ankomst-HUD
- [x] Advarsler vises separat nederst på kortfladen
- [ ] Fysisk kørsel på telefon ikke afprøvet

## Mobil HUD, ruteliste og ruteplanlægger 2026-10-08
- [x] Giv rutelistens aktuelle og øvrige stop adgang til samme aftalevindue som kortvisningen
- [x] Genbrug Ret aftale, Ny aftale, noter, datokontrol og fejlhåndtering i listevisningen
- [x] Adskil kørsels-HUD, driftsfejl og kontorbeskeder på korte mobilskærme
- [x] Tilføj mobil Visning samt lige tydelige Ny bestilling og Ny rute
- [x] Vis Aftaler og Kalender som separate mobilfaner, så kalenderen ikke ligger under en lang aftaleliste
- [x] Aktivér telefonens sikre skærmkanter i installeret app og almindelig mobilbrowser
- [ ] Kontrollér indlogget på mobil/tablet og kør målrettede regressionstests

# Master Audit & Refinement — Serviceydere.dk

## 5. nov. — Smartere virksomhedsoprettelse
- [ ] Login med eksisterende korrekte oplysninger før oprettelse; eksisterende ejere sendes til panelet uden dubletter.
- [ ] Mobiloprettelse: tydelig kontovalg, adgangskodevisning, kompakt bekræftelse og ingen blokeret bundknap.
- [ ] Regeltests og browserkontrol.

## 4. nov. — Branche- og bysiders Google-adgang
- [x] 705 offentliggjorte branche-/byruter: HTTP 200, korrekt canonical, første HTML-overskrift og ingen noindex. Alle registrerede ruter dækket af metadata, sitemap og fuldt indhold; udgivelse afvises ved mangler. 21 tests bestået, SEO-check 0 fejl/advarsler på 1.084 lokale sitemap-URL'er og build OK. København → elektriker-link afprøvet i browser.
- [x] Search Console (valgt https://serviceydere.dk/): to eksisterende sitemaps accepteret uden fejl/advarsler; rengøring/København indekseret, by/København og snerydning opdaget/ikke indekseret, privatrengøring og elektriker/Aarhus ukendte. Ingen unødvendig sitemap-genindsendelse; intet indekseringsrequest udført. Ny udgivelsesbeskyttelse endnu ikke offentliggjort.
- [x] Rengøring-, flyttehjælp- og håndværker-bysider: regneeksempel + 5 synlige spørgsmål/svar (samme i prerender og FAQ-data).
- [x] Fase 3 (del): nye Google-titler/beskrivelser til haveguiden (plads ~19, 875 visninger) og vinduesrens-artiklen (plads ~8,5) ud fra faktiske søgninger.
- [ ] Alle sider indekseret: afventer Googles crawling og beslutning; API-kontrol kan ikke anmode om indeksering.

## 3. nov. — Fortsat responsiv forside
- [x] Tabletens tekst og foto deler centreret bredde; mobilens overskrift/søgefelt/knapper har mere plads, søgeknappen er 44 px høj, og billedets sizes matcher den viste ramme uden beskæring.
- [x] Seks skærmstørrelser (320/390/768/820/1024/1280) uden vandret overflow; søgning på mobil/tablet åbner resultater med korrekt søgeord. Skærmbilleder kontrolleret; seks billedtests bestået og build OK. Ingen udgivelse udført.

## 3. nov. — Fortsat småbranche-SEO
- [x] Fire artikler udgivet i dag, 444 emner tilbage. Sidste daglige plads prioriterer mindst dækkede brancher; konkrete underbrancher matches til forælder med påkrævet branchelink. Registreringskilden har 54 brancher/214 underbrancher (tidligere optælling 55/213 var forkert).
- [x] 11 regeltests bestået; 1.064 sitemap-URL'er kontrolleret uden fejl/advarsler; build OK; SEO-motor deployet. Dagens kvote respekteret i live tick; Google accepterede det offentlige sitemap og tre nye artikler markeret indsendt. Kontorrengøringsartiklen med tabel og erhvervsrengøringslink åbnet i browser uden runtimefejl. Ingen ekstra artikel skrevet over kvoten; næste automatiske dækningsvalg og Google-indeksering af nye artikler endnu ikke observeret.

## 2. nov. — Fortsat målrettet SEO
- [x] Search Console: forsiden indekseret; seneste 28 dage 71 klik/6.073 visninger mod 99/7.739. Semrush DK og konkurrentindhold undersøgt; præcise long-tail-volumener er lave eller ukendte, ikke et løfte om nemme placeringer.
- [x] Fire særskilte virksomhedsartikler om Excel-oprydning, dagskapacitet, aflyste besøg/fakturering og adressekontrol. Links fra eksisterende artikler; 286 blogartikler og 1.010 sitemap-URL'er.
- [x] Månedlig rapports tidsplan aktiv, Search Console-forbindelse tilkoblet; live sitemap-index svarer HTTP 200. 17 SEO-tests bestået, SEO-check uden fejl/advarsler; alle fire artikler og linknavigation afprøvet uden runtimefejl, mobil uden vandret overflow; build OK. Ingen ny rapport sendt. Nye artikler kræver udgivelse før Google kan crawle dem; deres Google-indeksering er ikke verificeret. Sitemapstatus hos Google ikke genlæst, da to verificerede ejendomme dækker domænet og kræver valg før yderligere direkte kald.

## 2. nov. — Flere artikler + månedlig SEO-rapport
- [x] 10 nye artikler (282 i alt), sitemap opdateret; SEO-tests bestået.
- [x] Månedlig SEO-mail til ejeren d. 1. kl. 08.17 (dansk tid) med klik, visninger, placering, top-søgeord/sider og sitemapstatus; første rapport (oktober) sendt.

## 1. nov. — Ny samlet SEO-forbedring
- [x] Kontrollér søgemaskinernes adgang, metadata, strukturerede data og sitemap på hele den offentlige hjemmeside; grundkontrol uden fejl, Semrush-snapshot undersøgt (estimat, ikke målt trafik).
- [x] Fælles bymetadata på 72 sider og fuldt lokalt indhold i første HTML; 972 sider med fuldt indhold. Fjernet gamle prerender-entiteter ved navigation, ensrettet relevante artikelhenvisninger, rettet virksomhedsoversigtens metadata og forklaret fakturainterval/e-conomic/Dinero korrekt. Offentlige legacy-virksomhedslinks kan crawles; test- og callback-sider blokeret. Manglende artikelindhold stopper prerender frem for stille degradering.
- [x] 20 regressionstests bestået; SEO-check: 996 sitemap-URL'er, ingen fejl/advarsler. Alle artikler har statisk indhold. Tre offentlige sider afprøvet i browser med korrekte canonicals og uden runtimefejl; build OK. Live Google-indeksering/rangering er ikke verificeret; ændringer når live-siden ved næste udgivelse.

## 1. nov. — SEO på tværs af offentlige sider
- [x] Udvidet læsbart indhold til 900 offentlige sider: fulde factory-guider/softwaresider, funktionsguide, kategorioversigter og branche-bysider med kontekstuelle links. Øvrige sider beholder fallback.
- [x] Artikeldata/datoer og brødkrummer i statisk HTML; factory-metadata genbruges uden snippet-drift. Medarbejder-appens offentlige oplysninger ajourført.
- [x] Sitemap opdateret: 996 URL'er; alle 986 metadata-ruter findes i sitemap. Ingen kunstige build-datoer i sitemap-index. 13 regressionstests bestået, statisk indhold kontrolleret, offentlig medarbejder-appside verificeret i browser; build OK. Ændringer kræver næste udgivelse.

## Forbedringer i mindre dele (26. okt.)
- [x] Del 5c: Stopdetaljer bruger aktuelle data/ID og lukker ved datoskift/fjernelse; kørselsvindue kan ikke vise et andet stops fallback. Chat har samtaleejede beskeder/kladder, loading/fejl/retry, bevarer livebeskeder under hentning og beskytter ny samtale ved afsendelse. Stopnavne/adresser brydes; dobbelt næste-label og død færdig-rutevisning fjernet. Prisfelter har større +/- og én kolonne på mobil. 10 regressionstests og otte isolerede prisfelt-skærmtests bestået; build OK. Egen konto åbner Min dag men har ingen tildelte ruter/livechat; rigtige stopændringer og afsendelse ikke verificeret.
- [ ] Del 5: Hele medarbejderpanelet — navigation, overblik, ruter, tidsregistrering, historik, profil og vinduer; kortlægning pågår, forbedringer og skærmtests udføres i mindre dele uden at ændre manuel tid eller GPS-logik.
- [x] Del 5a: Kortlagt Min dag, Statistik, Livechat, arbejdspladsvalg, profil, beskeder, stophandlinger og kørselsvinduer. Større dato-/print-/periodeknapper, viewportbegrænsede kalenderpopover, beskeder med native separat åbn/slet og ombrydning, større note-genveje og fælles lukkeknapper. Rettet overskrevet kort-HUD-højde på korte skærme; lukket stopliste er inert. Beskeder/arbejdspladsvalg testet på fire bredder i begge temaer; HUD-højde ved 390×710, 844×390 og 1280×1800; 21 regressionstests bestået i to kørsler. Rigtige medarbejderflows og fuld rute-/statistik-/notevisning ikke verificeret.
- [ ] Del 5b: Kalenderdage er nu 44 px høje. Resterende: fuld rute-/statistik-/notevisning med rigtige data. Stopdetaljer, chat-isolation og prissteppers håndteret i Del 5c; Info-knappens tastaturhandling må ikke opsluges af rutens række. Rigtige stop-/chatflows blokeret af manglende tildelte ruter/livechat på egen konto; manuel tid og adgang er uændret.
- [x] Del 1a: Bestilling lukker efter gemte data uden at vente på mail; fjernet unødigt virksomhedsopslag. Kunder vises straks med bevarede tal. Services venter ikke på listegenindlæsning; dobbeltklik og retry efter delvis beregnergemning beskyttet. 22 tests bestået.
- [x] Del 1b: Ruteoprettelse genindlæser lokalt én gang efter stopgruppen, medarbejderopslag samlet i ét kald, fremdrift gennem hele gemningen, partial retry på samme rute/rækkefølge og korrekte fejl ved datoflytning. Datovælgerens genveje respekterer minimum og har større knapper. 27 tests bestået; ingen reel rutegemning målt.
- [x] Del 1d: Bestillingsgemning bevarer samme ordre- og varelinje-ID ved fejl, kontrollerer usikre writes før retry og springer gemte trin over. Beregnerfelter/priser/interval fastholdes i gemmesnapshot. Formularen låses ved delvis gemning. Fem nye regeltests; isoleret browserflow med afbrudt varelinjegemning gav én ordre, to varelinjeforsøg og én mail efter fuld gemning. Beskyttelsen gælder i det åbne vindue; genindlæsning/fane lukket og atomisk serverside-gemning er ikke dækket.
- [ ] Del 1c: Reel oprettelse/gemning og hastighedsmåling på virksomhedsdata. Blokeret: den tilgængelige egen konto åbner oprettelse af virksomhed, ikke et eksisterende virksomhedspanel; ingen testdata er skrevet.
- [ ] Del 2: Knapper, filtre og værktøjslinjer i hele virksomhedspanelet på mobil, tablet og computer.
- [x] Del 2a/3a: Medarbejdere + Anmeldelser: større filter-/handlingsknapper, tabletvenlige medarbejderrækker, fast bundlinje og højdebegrænsning i medarbejdervinduer, læsbare anmeldelsesnavne/datoer/kommentarer og danske decimaltal. Fælles søgning, primærknapper og pagination mindst 44 px. Isoleret kliktest 320/390/768/1280 px i begge temaer uden runtimefejl; 16 regressionstests bestået. Gemning på rigtig virksomhed fortsat blokeret som Del 1c.
- [x] Del 2b/3b: Regnskab + Indstillinger: større knapper/tidsvalg, tilgængelige filtre og switches, regnskabslog uden afskårne referencer, viewportbegrænset frakoblingsvindue og fleksible kolonner. Billedfelter tåler kontoindlæsning. Isolerede kliktests 320/390/768/1280 px i begge temaer uden runtimefejl; 19 regressionstests bestået. Ingen rigtige regnskabs-/betalings-/indstillingsændringer udført.
- [ ] Del 3: Formularer, dropdowns, kalendere og vinduer; fuld klikgennemgang side for side.
- [x] Del 2c/3c: Leads + Livechat: større filtre/kontaktknapper, leadkort med fleksibel handlingsrække, lange navne/e-mails brydes, tablet bruger én samtale ad gangen, større beskedhandlinger og skabelonvindue med samlet rulning og mobilpreview. 16 isolerede browserkombinationer (320/390/768/1280, begge temaer) uden vandret sideoverflow/runtimefejl; skabelonafskæring visuelt rettet og gentestet. 16 regressionstests bestået. Ingen rigtige leads ændret eller chatbeskeder sendt.
- [x] Del 2d/3d: Kom godt i gang + Overblik: guideindhold ruller på små skærme med synlig bundlinje, større trin-/kravknapper, næste-trin-stribe tåler blokeret lagring, større finans-/aftalefiltre og detaljehandlinger. Lange handlingslabels brydes, rating har dansk decimal, statistikvindue har breddebegrænset graf med rulning. 16 isolerede kliktests på fire bredder/begge temaer og 14 regressionstests bestået; build OK. Ingen rigtig virksomhedsgemning udført.
- [ ] Del 2e/3e: Resterende undervinduer i Kunder/Services/Aftaler; rigtig gemning og hastighedsmåling fortsat blokeret som Del 1c.
- [x] Del 2e/3e første del: Kundedetaljer har større kontakt-/rute-/lukkehandlinger, ombrydning og læsbar pausefarve. Serviceberegner har 44 px flyt/kopi/slet/enhedsvalg, fleksibel værktøjslinje og bundknapper; slet-/annulleringsvinduer højdebegrænsede. Serviceberegner og annullering kliktestet ved 320/390/768/1280 px i begge temaer med isolerede data; 15 regressionstests bestået. Ingen rigtig gemning eller kundedetalje-kliktest; aftaledetaljers små handlinger og kundens ordrelinje-editor mangler.
- [x] Del 2e/3e anden del: Aftaledetaljers godkend/tilpas/afvis/send/luk er mindst 44 px med ombrydning. Aftalelinjernes prisfelter fylder den ledige bredde, antal har større +/- og navngivne felter; intervalvalg har tydelig valgt tilstand. Slettebekræftelser har begrænset højde og større knapper. Faktiske redigeringsfelter kliktestet isoleret ved 320/390/768/1280 i begge temaer; 14 regressionstests bestået. Ingen ændring af beregning eller gemning. Fuld aftaledetalje-/kunde-kontekst og rigtig gemning mangler fortsat.
- [x] Del 4a: Seneste beskeder, regnskabslog/kø/fejl, fakturabatches og medarbejderstatistik er tilføjet til global synkronisering. Syv tabeller verificeret med publikation og eksisterende rækkeadgang. Regnskabets lokale status lytter med uden skeleton/draft-reset; ingen regnskabsnøgler i realtime. 14 tests bestået, herunder faktisk query-genlæsning af statistik, event-bursts og genforbindelse; build OK.
- [ ] Del 4b: Synkronisering på to samtidige skærme med rigtig virksomhed. Blokeret som Del 1c: egen konto viser virksomhedsoprettelse. Integrationens indstillinger og chat i lokal state er ikke dækket af Del 4a; ingen rigtig afsendelse/regnskabsændring udført.

Kilde: MASTER_PROMPT_COMPLETE_AUDIT_AND_REFINEMENT_OF_pasted.md
Regel: Kun forbedringer/bugfixes — ingen nye features, intet redesign, ingen schema-/dataændringer.

## Faser
- [x] Fase 1: Kortlæg projektet (4 parallelle audits: layout, performance, SEO, tilgængelighed)
- [x] Fase 2: Prioritering af bekræftede problemer
- [x] Fase 3: Touch-targets ≥44px (footer, kundefilter, onboarding, bulk-bar, undo-bar)
- [x] Fase 4: Virksomhedspanel — a11y på formularer, switches, dokumenter, kontakter
- [x] Fase 5: Performance — søge-cache-nøgle, memo af virksomhedskort, lazy login, billeder
- [x] Fase 6: SEO — 5 nye sitemap-ruter, software-metadata synket, prerender-body, robots
- [x] Fase 7: Tilgængelighed + konsolfejl (fetchPriority), DB-grants rettet
- [x] Fase 8: 564/565 tests grønne, typecheck ren, production build OK (944 prerenderede ruter)

## Bevidst ikke ændret (dokumenteret)
- Auto-prefetch af 4 sider: respekterer allerede save-data pr. projektregel
- Kategori-URLs canonical-politik: kræver produktbeslutning
- Custom-domæne canonical ved build: kræver build-tid data
- businesses select `*`: kræver felt-audit af kortene før indsnævring
- "ref to function component" dev-advarsel: kun i dev, ingen funktionel effekt

## Ruteplanlægger + virksomhedspanel (25. okt.)
- [x] «Tilføj aftale til rute» viser kun kommende, aktive, ikke-udførte ruter (fælles regel + test)
- [x] Panelfaner får egen sidetitel (noindex bevaret)
- [x] Samme regel i flyt stop og forslag til rute; mobil dagstæller adskiller forventede
- [x] Ruteplanlægger + Aftaler: gennemgang 320–1305 px, lyst/mørkt; større knapper og filterrække på mobil
- [ ] Fuld klikgennemgang af resten af panelsiderne (vinduer og gem-handlinger)
- [x] Automatisk gennemgang af 10 panelsider × 5 bredder: ingen vandret rulning, rettet kontakter uden navn, små knapper (services, faktura), indstillinger ved 320 px
- [x] «Ret aftale»: ét trin, kunde/dato i top, pris i bund, baggrundsvinduer dæmpes
- [x] Kunder + Services: større knapper, afkrydsning og søgefelt
- [x] Medarbejdere + Anmeldelser: gennemgang af layout, filtre og åbning/lukning af vinduer med isolerede eksempeldata; ingen virksomhedsgemmehandling udført.
- [x] Regnskab + Indstillinger: layout og udvalgte klikflows afprøvet med isolerede data; åbningstider, synk-søgning/detaljer, frakobling annulleret. Rigtig gemning og forbindelse er ikke verificeret.
- [x] Fakturainterval: standard i Regnskab, pr. kunde, pr. aftale; samlet faktura pr. periode (ikke testet mod rigtigt regnskabsprogram)
- [x] Fakturainterval i Opret bestilling, tydeligere intervalvalg/vinduer og vedhæftet ikon; testet med aktiv konto ved 393/768/1305 px, 8 regeltests bestået. Ingen reel bestilling oprettet eller regnskabsindstilling ændret.

## 27. okt. — Jimmy's VP opfølgning
- [x] e-conomic: kundenummer-konflikt (SkvizBiz-numre) kobler nu til eksisterende kunde eller lader e-conomic vælge; afviste kunder genkørt.
- [x] Forventede ruter manglede pga. for lange opslag (>500 id'er) — opslag deles nu op.
- [x] 62 faste aftaler fra filen sat på deres ruter; 302 "Ikke fast" uden dato bliver i puljen (filen har ingen dato).
- [x] Aftaler uden rute/Kunder hentede kun 300/1000 rækker — henter nu alle.
- [x] Testkunders påmindelser stoppet; @hej.dk → @hej.invalid; afsender springer testdomæner over.
- [x] Leads hopper ikke ved opdatering; Regnskab blinker ikke efter tilkobling; medarbejdervindue mobilvenligt.
- [x] Ruteplanlægger springer til første måned med ruter + "Næste rute"-knap.
- [x] SEO: sider sendte kun titel/beskrivelse til Google — nu fuld artikeltekst og interne links i HTML; 9 nye ruteplanlægningsartikler; LinkedIn-link på forsiden.

## 28. okt. (aften)
- [x] Billedbevis: miniaturer + komprimering, nyt Før/Efter-design, kameraknap i tjekliste, bedre fejlbeskeder
- [x] Tom rute slettes når sidste aftale slettes
- [x] Importerede services kan redigeres uden kategori
- [x] Kundepanel: fakturaer samlet pr. faktura med aftaler; tomme-knapper fjernet
- [x] Regnskab: kunder er synkroniseret; aftaler bogføres først ved udført besøg (bevidst)

## SEO-plan (nov 2026)
- [x] Lokale branchesider linker til andre registrerede services i samme by uden selvlinks; fælles links i browser/HTML. Googles tekst bruger nu de samme håndskrevne bytekster og områder som siden. 19 tests bestået; SEO-check 0 fejl/advarsler, 1.073 URL'er. Linknavigation afprøvet på mobil/computer uden overflow/runtimefejl; build OK. Ikke udgivet.
- [x] Motor forbedrer artikler på side 2 og gamle artikler (tirs/fre)
- [x] Kort svar øverst, synlige datoer, redaktionsside
- [x] Sammenlægning af artikler der konkurrerer om samme søgning
- [ ] Yderligere dokumenteret lokalt indhold: kræver verificerbare kilder/virksomhedscases; eksisterende bytekst og links forbedret uden nye udokumenterede lokale påstande.
- [x] Sitemap: automatiske artikler, egne datoer, billeder, læsbar tekst uden JavaScript
- [ ] Hastighedsmåling på mobil og ugentligt tjek af ødelagte links
- [x] Udvidet månedlig SEO-rapport + admin-tal
- [x] Liste over steder at få omtale/links (kræver brugeren)

## SEO-plan v2 (nov 2026)
- [x] Bysider: DST-fakta (befolkning, boligtyper, alder) for 10 største byer i browser + prerender
- [ ] Udbydere i området på bysider (kræver offentlig virksomhedsliste ved build)
- [ ] Rapport-sektion "Bysider"; næste 20 byer efter 4-6 uger
- [ ] Branche-softwaresider med skærmbilleder; sammenligningssider (SkvizBiz/Fenster)
- [ ] Gratis værktøjer; "Kort svar" i håndskrevne artikler; ugentligt døde-links-tjek

## AI-søgning (nov 2026)
- [x] Navnestavemåder i virksomhedsoplysninger, AI-fil, footer; AI-crawlere tilladt; brandlinje i månedsrapport
- [ ] CVR/adresse/stiftelsesår til Googles virksomhedsoplysninger (venter på bruger)
- [ ] Eksterne profiler fra tjeklisten (bruger)
- [ ] "Kort svar" på guides/branchesider, spørgsmål-svar-sider, sammenligningssider

## SEO-plan (4. nov 2026)
- [x] Fase 1: GSC-måling (73 klik, 6.082 visninger, plads 13) + SEO-scanning (0 fejl)
- [x] Hurtig gevinst: svedplet-artiklens titel/beskrivelse matcher søgningen
- [x] Fase 2 (del): haveservice-bysider fik regneeksempel + synlig FAQ (Odense var "gennemgået, ikke indekseret")
- [ ] Fase 2: samme løft for rengøring/flyttehjælp/håndværker-bysider, opdelt sitemap
- [ ] Fase 3: titler på sider med plads 8–20 (fx /guides/have, 875 visninger, 0,2 % klik)
- [ ] Fase 4: prisguider og "rutesystem til [branche]"
- [ ] Fase 5: Google Business- og Trustpilot-profil (kræver William)
- [ ] Fase 6: mobilhastighed

## Kun profil + 30 dages prøveperiode
- [x] Prøveperiode 14 → 30 dage overalt (Stripe, DB, tekster, artikler, mails, SEO)
- [x] "Kun profil"-plan: database-guards, onboarding-valg, panel-skjul, opgradering/nedgradering, tests

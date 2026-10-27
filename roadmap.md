# Master Audit & Refinement — Serviceydere.dk

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

# Gennemført visuelt redesign af ruteplanlæggeren

## Retning
Behold computerens nuværende grundlayout: en fast liste med aftaler uden rute til venstre og kalender/ruter til højre. Designet ændres markant inden for denne struktur, så det opleves som ét professionelt planlægningsværktøj frem for mange små standardelementer.

Farverne får faste betydninger:
- Teal: primær handling, fokus og aktivt valg
- Grøn: udført og problemfri status
- Rav: opmærksomhed eller mulig konflikt
- Rød: fejl, blokering og ugyldigt slip
- Neutrale flader: almindeligt indhold og navigation

Typografien bliver en skarp, teknisk sans-serif med tydelig forskel på navn, metadata, status og handling. Ingen dekorative farver uden betydning.

## Designsystem og alle tilstande
- Saml ruteplanlæggerens overflader, kanter, skygger, kontrolhøjder, typografi og statusfarver i genbrugelige semantiske designregler.
- Definér konsekvente tilstande for normal, hover, trykket, aktiv, valgt, tastaturfokus, disabled, loading, fejl, advarsel, succes og tom visning.
- Gør valgt og aktiv visuelt entydigt med accentkant og rolig baggrund; hover må aldrig ligne et permanent valg.
- Gør drag-and-drop tydeligt før, under og efter træk: gyldigt mål, advarsel, ugyldigt mål, kildekort og ventetilstand får hver sin klare reaktion uden layout-hop.
- Respektér reduceret bevægelse og brug korte, rolige overgange.

## Computerens arbejdsflade
- Behold venstre/højre-opdelingen, men skab en tydelig visuel rangorden mellem sidens værktøjslinje, aftalebakken, kalenderen og ruterne.
- Gør aftalebakken lettere at scanne: tydelig overskrift og antal, samlet søgning/filtrering, læsbare aftalekort og synlige handlinger uden at udvide panelet manuelt.
- Redesign aftalekort med professionel informationsrækkefølge, konsekvent valg, bedre hover/fokus og klare statusindikatorer.
- Gør kalenderens celler og ruter større og mere informative i den plads, der allerede findes, med tydelige aktive dage, valgte ruter, konflikter og dropmål.
- Fjern den nuværende visuelle støj fra for mange næsten ens grå knapper og mikrotekst; de vigtigste handlinger skal kunne findes med det samme.

## Mobil og tablet
- Brug samme information, statusfarver, kort og handlinger som på computer; ingen funktionsmæssig særudgave.
- Behold “Aftaler uden rute” permanent på skærmen sammen med ruterne, så træk mellem områderne fortsat er muligt.
- Tilpas højder, scrollområder og berøringsmål, så begge områder kan bruges uden popup og uden skjulte handlinger.
- Gør valgte, aktive og drag/drop-tilstande lige så tydelige med berøring som med mus.

## Dialoger, paneler og popups
- Gennemgå alle ruteplanlæggerens dialoger og sidepaneler: opret rute/bestilling, redigér rute, stopdetaljer, flyt/flet, historik, sygemelding, ruteforslag, massehandlinger og mobilpaneler.
- Giv dem samme overskriftshierarki, sektioner, felter, knapper, statusfarver, fokus og fejlvisning som hovedsiden.
- Bevar eksisterende funktioner og dansk tekst, men fjern visuelt dobbeltarbejde og sørg for én tydelig primær handling pr. trin.

## Eksisterende produktregler fastholdes
- Ingen synlig servicevarighed, arbejdstid eller udførelsestid på aftaler, fletning eller historik.
- Ingen “I gang”-filter.
- Belastning vises efter antal stop, ikke timer.
- Bestillinger kræver mindst én aktiv service.
- Kort og rutefunktioner må ikke kræve API-nøgle.

## Teknisk gennemførelse
- Udvid de eksisterende semantiske farvetokens og fælles varianter frem for at sprede specialfarver i enkeltkomponenter.
- Erstat inkonsistente lokale knaptilstande med de fælles knap- og kontrolvarianter, hvor det er muligt.
- Saml aftalekort, rutekort, stoprækker, filtre og dialogsektioner om fælles visuelle tilstandsregler.
- Bevar al eksisterende planlægnings-, optimerings- og drag-and-drop-logik; dette arbejde ændrer præsentation og brugervenlighed.

## Kontrol
- Test hele siden indlogget ved 1305×824, 768×1024 og 375×812.
- Kontrollér visuelt normal, hover, aktiv, valgt, fokus, disabled, loading, fejl og drag/drop for centrale elementer.
- Gennemfør den centrale arbejdsgang: vælg aftale, træk til rute, åbn rute, brug filtre og åbn relevante dialoger.
- Kontrollér at tekst ikke overlapper, at handlinger er synlige, og at mobilens to arbejdsområder kan bruges samtidigt.
- Kør relevante automatiske tests og kontrollér den aktuelle bygge- og runtime-log uden fejl.

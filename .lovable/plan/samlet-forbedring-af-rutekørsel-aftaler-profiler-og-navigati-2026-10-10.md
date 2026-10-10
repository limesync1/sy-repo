# Samlet forbedring af rutekørsel, aftaler, profiler og navigation

## Mål
Gøre arbejdsfladerne robuste, ensartede og lette at forstå på mobil, tablet og computer. Kort/HUD skal fungere som én samlet kørselsoplevelse, alle modaler skal bruge samme designsystem, og aftale- samt tidsregistreringslogik skal hjælpe brugeren uden at gætte eller skabe forkerte data.

## 1. Robust rutekørsel og responsiv HUD
- Fjern **Kortinfo**-knappen og hele den synlige diagnosticeringsboks. Bevar kun intern fejllogning og sikker Google/Leaflet-reserve.
- Opdel den nuværende store rutekørselsside i tydelige HUD-dele: topkontroller, manøvrebanner, driftsbeskeder, stopkort og bundhandlinger. Kort og HUD får ét fælles layoutgrundlag i stedet for ad hoc bredder.
- Erstat kortets skrøbelige opslag efter CSS-klassenavne med målte HUD-zoner via refs/`ResizeObserver`, så bil, rute og næste stop altid har korrekt fri plads.
- Indfør responsive layouts for:
  - mobil: kompakt topbjælke og bundkort inden for sikre skærmkanter,
  - tablet: bredere stopkort uden mobilens sammenpresning,
  - computer: samlet sidepanel/HUD med kontroller i logiske grupper i stedet for små flydende mobilknapper.
- Saml touch-, mus- og tastaturtilstande: mindst 44 px trykflader, synlig fokus, konsistente hover/active/disabled-tilstande og ingen overlappende kliklag.
- Bevar FOLLOW/FREE/OVERVIEW-kameralogikken, brugerens zoom og én bilmarkør. Begræns kameraopdateringer til reelle positions-/retningsændringer og undgå automatiske spring under manuel kortbrug.
- Opdatér Advanced Markers til understøttet eventhåndtering og behold positionsbaseret synkronisering/oprensning uden flimren.

## 2. Nyt handlingsdesign ved hvert stop
- Erstat de tre ens outline-knapper med et klart hierarki:
  - primær konteksthandling for tidsregistrering/udførsel,
  - tydelige sekundære handlinger **Ret aftale**, **Ny aftale** og **Note til kontoret** med ikon og hjælpetekst,
  - destruktive handlinger adskilt visuelt.
- Fjern **Flere handlinger**-menuen, når den kun indeholder ét valg. Vis **Udfør uden registreret tid** direkte med forklaring og bekræftelse.
- Brug samme handlingsstruktur i tjekliste, rutekørsel og aftaledetaljer, så placering og betydning ikke skifter mellem visninger.

## 3. Ensartede og enklere modaler
- Byg medarbejderens **Ret aftale**, **Ny aftale** og **Note til kontoret** på det eksisterende fælles overlay-system fra **Opret bestilling/Rediger rute**: `SheetHeaderBlock`, `Section`, `Field`, `CollapsibleSection` og `SheetFooterBar`.
- Gør formularerne trinvise og mindre overvældende:
  1. hvad ændres/oprettes,
  2. dato og gentagelse,
  3. placering på rute,
  4. oversigt og bekræftelse.
- Vis avancerede pris-/serieindstillinger kun ved behov. Bevar serverberegnede priser og de eksisterende scope-valg for denne/fremtidige aftaler.
- Tilpas **Føj til rute** og **Flyt dato** til præcis samme header-, sektions-, afstands-, feedback- og footerstruktur som **Rediger rute/Opret bestilling**. De bruger allerede dele af systemet, så arbejdet er harmonisering frem for endnu et nyt modaldesign.
- Ensret loading, valideringsfejl, tomme tilstande, annullering og mobilens bundark kontra desktopens sidepanel.

## 4. Klogere Ny aftale og Ret aftale
- Saml beslutningen om dato, gentagelse og ruteplacering i én genbrugelig beslutningsmodel i stedet for separat UI-logik i flere modaler.
- Ved **Foreløbig opstartsdato** skal UI forklare resultatet før oprettelse:
  - samme dato og engangsaftale: tilbyd dagens aktuelle rute,
  - fremtidig dato med en næste forekomst af samme rute: tilbyd den forekomst,
  - gentagelse: forklar første dato og hvordan efterfølgende forekomster planlægges,
  - ingen egnet rute: placér tydeligt i **Aftaler uden rute**.
- Brug et eksplicit valg som “Næste forekomst af samme rute”, “Vælg en anden rute” eller “Aftaler uden rute”; systemet må ikke flytte noget lydløst.
- Ved **Ret aftale** vises konsekvensen før gem: kun dette besøg, dette og fremtidige eller hele serien, inklusive påvirkning af dato/rute.
- Genbrug eksisterende servervalidering og RPC-resultater; tilføj kun backendændringer, hvis nuværende API ikke kan returnere egnede ruteforekomster eller udføre det valgte scope atomisk. Priser forbliver serverberegnede.

## 5. Sikker og automatisk tidsregistrering
- Saml timerstatus i én fælles hook/model, så HUD og detaljeark viser samme aktive stop og samme varighed.
- Når medarbejderen starter næste stop, afsluttes en åben registrering fra et tidligere stop automatisk ved overgangstidspunktet, og den nye startes atomisk. Vis en kort kvittering i stedet for den gentagne dialog **Tidsregistrering kører allerede**.
- Hvis registreringen tilhører samme stop, genbruges den eksisterende timer uden ny start.
- Hvis data er tvetydige, offline eller serverhandlingen fejler, må systemet ikke gætte: vis én klar konfliktløsning og bevar den eksisterende registrering.
- Bevar manuel start/stop og **Fortryd udførsel**. Ingen timer må startes alene på GPS-ankomst; automatisk afslutning sker kun ved en eksplicit overgang til næste stop.
- Flyt den atomiske stop/start-regel til serveren og returnér den resulterende aktive registrering, så dobbeltklik og flere enheder ikke kan skabe overlap.

## 6. Én note til kontoret
- Omdøb den medarbejderoprettede note konsekvent til **Note til kontoret** i rutekørsel, detaljer og modal.
- Skeln visuelt mellem kundens eksisterende bestillingsnote og medarbejderens note til kontoret, men brug ikke betegnelsen **Din note**.
- Bevar datakilder og historik; dette er en tydeliggørelse af label og præsentation, ikke sammenlægning af kundens note med interne noter.

## 7. Profilredigering i begge paneler
- Opdatér medarbejderens **Rediger profil** til samme fælles modaldesign som **Opret bestilling**, inklusive responsivt layout, billedupload, gemmefeedback og fejltilstande.
- Tilføj **Rediger profil** i virksomhedspanelets profilmenu med samme oplevelse. Den redigerer den indloggede ejers navn/profilbillede; virksomhedens offentlige oplysninger forbliver i virksomhedsindstillingerne, så person og virksomhed ikke blandes sammen.
- Genbrug fælles profilfelter/modaldele, men behold de korrekte datakilder og adgangskontroller for medarbejder og virksomhedsejer.

## 8. Kompakt offentlig header og mobilmenu
- Gør mobilheaderen lavere og enklere med logo, én primær handling og menuikon; flyt sekundære rolle-/kontolinks ind i menuen.
- Ret breakpoint-overgangen, så tablet ikke blander mobilmenu og desktop-elementer.
- Ensret aktive links, hover, pressed, tastaturfokus, åben/lukket menu og dark mode-kontrast. Aktiv side skal være tydelig uden hover.
- Bevar én fælles offentlig navigation og undgå dublerede headers.

## 9. Robusthed, tilgængelighed og test
- Tilføj komponent-/integrationstest for:
  - HUD-zoner, fri/følg-tilstand og brugerzoom,
  - tablet/desktop-layout og overlap,
  - Advanced Marker-events og oprydning,
  - automatisk stop/start uden overlappende timer,
  - Ny/Ret aftale-beslutninger for dagsdato, fremtid, gentagelse og manglende rute,
  - ens labels og direkte handling uden redundant menu,
  - profilmodal for begge roller,
  - headerens breakpoints, active/focus og mobilmenu.
- Gennemfør visuel browserkontrol som relevante roller på mobil, tablet og computer i både lyst og mørkt tema. Kontrollér desuden skærmtastatur, scrolling, lange danske tekster og reduceret bevægelse.
- Verificér fejlscenarier: afvist kortnøgle, manglende GPS, langsomt netværk, dobbeltklik, forældede rutedata og serverfejl uden tab af brugerens input.

## Teknisk rækkefølge
1. Fælles responsive overlay-/HUD-primitiver og fjernelse af Kortinfo.
2. HUD, kortintegration og stophandlinger.
3. Fælles timerstatus og atomisk stop/start.
4. Ny/Ret aftale-beslutningsmodel og modalredesign.
5. Bulkmodaler, noter og profilmodaler.
6. Offentlig navigation.
7. Samlet regressionstest på enheder og temaer.

## Afgrænsning og sikkerhed
- Ingen ændring af genererede filer eller `.env`.
- Browser- og servernøgler forbliver beskyttet efter deres nuværende roller.
- Eksisterende danske labels som **services**, **Opret bestilling** og **Fortryd udførsel** bevares.
- Manuel tidsregistrering, serverberegnede priser og den eksisterende custom kalender bevares.

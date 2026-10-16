# Rutekørsel som Google Maps: sammenligning, finpudsning og fuld fejltest

## Vigtigt at vide først
Google Maps i en browser (google.com/maps) har ingen vejvisning med kørende bil. Den findes kun i telefonens app. I browseren kan jeg se rutevisning, rutelinjer, alternative ruter, markører, knapper og trinvis vejvisning. Derfor sammenligner jeg sådan:
- **Browser:** Jeg åbner google.com/maps, søger ruten Vistorpvej 30, Haderup → Bauhaus Herning og tager billeder af ruteoverblik, linjer, trafikfarver, knapper og trinliste i lys og mørk tilstand.
- **Kørsel:** Jeg sammenligner med det, Google selv dokumenterer om navigation, og med kendt adfærd i appen: fast bil nederst på skærmen, kort der drejer blødt, zoom der følger farten, linjen bag bilen der bliver grå, og stille kamera ved rødt lys.
- **Vores kort:** Den gemte testtur Haderup–Herning afspilles i vores app, og bilen måles billede for billede.

## 1. Måling af hvor blød bilen er
- Bilens og kameraets position måles 60 gange i sekundet under afspilning af testturen.
- Rapport med tal: ryk (pludselig ændring i fart), sidelæns hop, drejehastighed, hvor langt bilen er bag GPS'en, og hvor tit kortet drejer unødigt.
- Mål: ingen hop over 2 m, ingen drejning over 90°/s ved bykørsel, bilen højst 1 sekund bag GPS'en ved jævn kørsel.

## 2. Forbedringer, så vores kort føles som Google Maps
- **Zoom efter fart:** Tættere på i byen, længere ude på motorvej. Kun blødt, og kun hvis man ikke selv har zoomet.
- **Kortet ser fremad:** Bilen står lidt lavere på skærmen ved højere fart, så man ser mere af vejen foran.
- **Blødere drejning af kortet:** Kortet drejer med vejens retning lidt forud for svinget, ikke efter.
- **Kørt strækning bliver grå**, og linjen foran bilen er altid tydelig.
- **Næste sving:** Lille zoom ind lige før et sving i byen og tilbage igen bagefter.
- **Ruteoverblik** i Google-stil: hele ruten med luft rundt om, stopnumre, total tid og afstand.
- Alt afhænger af den nuværende positionsmotor, så bil, kamera og ankomst stadig er enige.

## 3. Gennemtest af alle knapper og vinduer
Hver knap og hvert vindue i rutekørsel testes på mobil, tablet og computer, i lys og mørk tilstand:
- Centrér, Rute (overblik), Trafik, Satellit, Kompas, Lyd.
- Ankommet, Start tid, Udført, Fortryd, Spring over, Ring, Note til kontoret, Info, Ret aftale, Ny aftale.
- Alle stop, Ændr rækkefølge, Optag kørsel, Se optagelse, Flere muligheder.
For hver: virker den, vises den korrekt, og hvad sker der, når noget går galt.

## 4. Fejlbeskeder på jævnt dansk
Hver fejl får en kort besked med: hvad der skete, hvad det betyder, og hvad man kan gøre. Eksempler:
| Situation | Besked |
|---|---|
| Ingen GPS | «Vi kan ikke finde din position. Tjek at placering er slået til for browseren.» |
| GPS afvist | «Du har slået placering fra. Slå den til i telefonens indstillinger for at se bilen på kortet.» |
| Ingen internet | «Du er offline. Kortet viser det, der allerede er hentet. Vi prøver igen, når du har net.» |
| Google-kort virker ikke | «Google-kortet kunne ikke åbne. Vi viser reservekortet, så du kan køre videre.» |
| Vejvisning kunne ikke hentes | «Vi kunne ikke beregne vejen til næste stop. Linjen vises som lige streg, indtil vi prøver igen.» |
| Adresse uden koordinater | «Vi kan ikke finde adressen på kortet. Kontakt kontoret, så adressen bliver rettet.» |
| Gem fejler (udført, note, rækkefølge) | «Det blev ikke gemt. Tjek forbindelsen og tryk Prøv igen.» |
| Ingen adgang | «Du har ikke adgang til denne rute. Spørg din leder.» |
Alle tekniske fejl samles ét sted, så samme fejl altid giver samme besked.

## 5. Leverance
- Rapport med billeder fra Google Maps ved siden af vores kort, og måletal før og efter.
- Liste over fundne fejl i knapper og vinduer, og hvad der er rettet.
- Google-kortet kan ikke vises i mit testmiljø (nøglen virker kun på dit domæne). Jeg tester bilen og knapperne på reservekortet og med selve kameraberegningerne, og du får en kort tjekliste til telefonen.

## Tekniske detaljer
- Google Maps i browseren besøges via Playwright; screenshots gemmes i /mnt/documents/google-maps-sammenligning/.
- Måling: Playwright med mocket geolocation afspiller `/tmp/haderup-herning-trace.json`; `positionTrack` samples via en test-hook (kun i dev) og eksporteres som CSV.
- `google-nav-camera.ts`: `followZoom` får fartbaseret zoom (ca. 17.5 by, 15.5 motorvej, lavpasfilter, slås fra ved brugerzoom); look-ahead-offset efter fart; heading fra `smoothPolyline` med look-ahead 20–40 m.
- `GoogleRouteMap.tsx`: kørt strækning tegnes grå ud fra `progressM`; manøvre-zoom fra `useCurrentManeuver` som midlertidig delta.
- `src/lib/danish-errors.ts` udvides med kategorier (geolocation, netværk, Google auth/timeout, routes, RLS/adgang, gemning) og bruges i `DriveIssueBanner` og toasts.
- Vitest for kamera (zoom/fart, look-ahead), fejlkortlægning og knapper i `GoogleRouteMap.test.tsx`; Playwright på 390, 768, 1280 px.

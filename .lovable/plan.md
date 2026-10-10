# Robust Google-kort i rutekørsel – ombygning af kamera og kort

Problem: Kortet ryster, springer tilbage, når man zoomer ud, og føles som det gamle kort i nyt design. Ud fra koden er årsagerne sandsynligvis:
- Kameraet flyttes på hvert eneste skærmbillede (ca. 60 gange i sekundet). Samtidig flyttes midtpunktet frem i kørselsretningen. Hver lille retningsændring flytter derfor kortet sidelæns, og det ses som rysten.
- Bilpilen er en ældre markørtype, som tegnes lidt efter kortet på det drejende 3D-kort. Derfor dirrer den i forhold til vejen.
- Brugerens zoom genkendes via kortets egne zoom-hændelser. De blandes sammen med kameraets egne bevægelser, så knib-zoom tolkes forkert. Kameraet tvinger samtidig sin egen zoom tilbage, og efter 10 sekunder hopper kortet tilbage midt i brugen.
- Rester fra det gamle kort styrer stadig en del af vejvisningsskærmen: zoomlogik, måling af felterne øverst og «følg»-tilstand. Derfor føles det som det gamle kort.

## 1. Find den faktiske tilstand først
- Vis et lille diagnosemærke under «Flere muligheder» → «Kortinfo»: hvilket kort der er i brug (Google 3D, Google fladt eller reservekort), om din kortindstilling er indlæst, og seneste kortfejl.
- Skriv samme oplysninger i konsollen, så fejl på din telefon kan læses. Det bekræfter, om du faktisk ser Googles 3D-kort eller en reserve.

## 2. Nyt kamera med tre klare tilstande (som Google Maps)
```text
FØLG  ──(bruger rører kortet)──►  FRI  ──(tryk «Centrér»)──►  FØLG
  ▲                                 │
  └──────(tryk «Rute»)── OVERBLIK ◄─┘
```
- **Følg:** Kameraet opdateres ved hver ny GPS-position (ca. 1 gang i sekundet), ikke ved hvert skærmbillede. Det glider blødt mellem positionerne over cirka et sekund. Retningen skifter kun ved fart over ca. 10 km/t og ved ændringer over et par grader.
- **Bilens plads på skærmen:** Kortets centrum regnes ud fra skærmens felter øverst og nederst, ikke ved at skubbe midtpunktet frem i kørselsretningen. Det fjerner sidelæns rysten.
- **Zoom i følg-tilstand:** Kniber du for at zoome, beholder kortet din zoom og bliver ved med at følge, som i Google Maps. Automatisk zoom før sving er kun midlertidig og vender tilbage til din zoom.
- **Fri:** Træk eller drej med fingeren, så rører kameraet ikke kortet. Kortet springer aldrig selv tilbage, mens du bruger det. Først efter 15 sekunder uden berøring, og kun under kørsel, vender det blødt tilbage. Knappen «Centrér» virker altid.
- **Overblik:** Hele ruten fladt og nord op. «Centrér» vender tilbage til kørsel.
- Berøring registreres direkte fra fingeren på kortet, så kameraets egne bevægelser aldrig forveksles med brugerens.

## 3. Bilpil uden dirren
- I følg-tilstand står bilpilen fast et bestemt sted på skærmen, og kortet bevæger sig under den, som i Google Maps. Den kan derfor ikke ryste.
- I fri tilstand og i overblik bruges Googles nye markørtype, som tegnes sammen med kortet.
- Pilen lægges kun ind på vejen, når det sker jævnt. Ingen spring mellem vejen og den rå GPS-position.

## 4. Stop og linjer på Googles nye markører
- Stopnåle laves om til Googles nye markører med vores design: næste, kommende, udført og start. De opdateres kun ved statusændringer, så de ikke blinker.
- Rutelinje, trafikfarver og grå kørt strækning bevares, men tegnes kun om, når ruten ændrer sig, ikke ved hver position.

## 5. Fjern det gamle korts logik fra Google-visningen
- Vejvisningsskærmen deles i en ren Google-del og en reservedel. Leaflet-logik som zoomvagter, «følg»-styring og måling af felterne kører kun, når reservekortet faktisk vises.
- Én fælles måling af felternes højde (øverst og nederst), som bruges af både kamera og knapper. Den opdateres kun, når størrelsen ændres.

## 6. Responsivt og brugervenligt
- Mobil lodret og vandret, tablet og computer: felterne øverst og nederst placeres efter skærmen. Kortknapperne flytter, så de aldrig dækker bilen, næste sving eller Googles logo.
- Store, tydelige kortknapper (centrér, kompas, rute, trafik, satellit) med samme farver i lys og mørk tilstand.
- Når appen skjules og åbnes igen, eller telefonen drejes, beholder kortet tilstand, zoom og retning.

## 7. Test
- Automatisk test af kameraets tilstande, så zoom aldrig hopper tilbage, og af udglatning af retning (ingen rysten ved GPS-støj).
- Simuleret kørsel af Patricks testrute med afspillet GPS: zoom ud under kørsel, træk i kortet, centrér, overblik, sving og ankomst.
- Skærmbilleder af reservekortet på mobil, tablet og computer. Selve Google-kortet kan ikke vises i testmiljøet, så du får en kort tjekliste til test på telefonen.

## Tekniske detaljer
- Ny `useGoogleNavCamera` (ren tilstandsmaskine: follow/free/overview) med GPS-drevne mål, lerp-animation via rAF over ca. 900 ms, `moveCamera` kun under animation og heading-dødbånd på 3° med en grænse for vinkelhastighed.
- Brugerinput via `pointerdown`/`wheel`/`gesturestart` på containeren (ikke `zoom_changed`). `userZoom` gemmes og bruges som basis. Manøvre-zoom anvendes som midlertidig delta.
- Centrumoffset via `map.getProjection()` i skærmrum efter rotation: offset beregnes langs skærmens lodrette akse ud fra HUD-højde, ikke langs heading.
- `AdvancedMarkerElement` (kræver Map ID, som er sat) for stop og puck i fri tilstand. Fast HTML-puck i følg-tilstand.
- Diagnose: `getRenderingType()`, om Map ID er indlæst og fejlårsag eksponeres i et lille panel og i `console.info`.
- `EmployeeRoute.tsx`: Leaflet-only hooks (`MapInteractionWatcher`, zoom-dwell, bearing) gates bag `mapProvider === "leaflet"`. Fælles `useHudInsets` via ResizeObserver og CSS-variabler.
- Fjern auto-genfølg efter 10 s i fordel for 15 s, kun ved inaktivitet i fri tilstand.

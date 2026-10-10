# Google Maps som kort i rutekørsel

## Mål
Rutekørsel-kortet skifter fra det åbne kort til Google Maps, men alt det, medarbejderen ser og gør i dag, fungerer som før, bare mere robust: stop med nummer og status (udført, næste, kommende), rutelinjen, ens egen position med kørselsretning, ankomst ved ca. 100 m, kameraet der følger bilen og manuel tidsregistrering.

## Hvad medarbejderen får
- Google Maps' kort i dag- og nattilstand (mørk stil, der passer til appen).
- Udførte stop vises tydeligt med flueben og nedtonet. Næste stop er fremhævet, og linjen dertil er tydelig. Kommende stop vises neutralt.
- Knapper på kortet: centrér på mig, trafik til/fra og kort/satellit. De ligger uden om HUD'en og Googles logo.
- HUD'en, tjeklisten og bundpanelet tilpasses Google-kortet, så intet dækker hinanden på mobil, tablet og computer.
- Det nuværende åbne kort bevares som automatisk reserve. Medarbejderen kan altid køre videre.

## Fejlscenarier og hvordan de håndteres
| Scenarie | Håndtering |
|---|---|
| Browseren lukkes hurtigt og åbnes igen | Google-scriptet indlæses kun én gang. Kortet oprettes først, når pladsen har en reel størrelse. Ruten, udførte stop, valgt stop, følgetilstand og kortvalg (trafik/satellit) hentes fra serveren og den lokale lagring, så kortet åbner samme sted |
| Siden skjules eller telefonen låses | GPS og animation pauses. Ved retur hentes ruten igen, og kameraet hopper roligt til den aktuelle position |
| Google indlæses langsomt | Skeletkort i 8 sekunder. Derefter skiftes der automatisk til reservekortet, og et lille banner vises med "Prøv Google igen" |
| Nøglen afvises (forkert domæne, fakturering, kvote) | Googles fejl fanges. Der skiftes til reservekortet med en forståelig dansk besked. Andre skærme påvirkes ikke |
| Offline eller dårlig forbindelse | Det eksisterende forbindelsesbanner bruges. Allerede indlæst kort og markører bliver stående. Ingen gentagne forsøg i løkke |
| Adresse uden koordinater | Samme besked og "Prøv igen" som i dag. Stoppet springes over på kortet uden at noget går ned |
| Et stop markeres som udført eller fortrydes | Markøren skifter status med det samme. Nummer og rækkefølge ændres ikke, og linjen opdateres |
| Hurtige skift mellem liste og kort | Kortet oprettes kun, når kortvisningen er valgt, og ryddes helt op ved skift (ingen dobbelte kort eller lyttere) |
| Medarbejderen trækker eller zoomer kortet | Følgetilstand stopper, og "Centrér" vises, ligesom i dag |
| Skift mellem dag og nat | Stilen skiftes på det samme kort uden at genindlæse det |

## Hvad der ikke ændres
- Ruteplanlæggeren i virksomhedspanelet og søgekortet beholder deres nuværende kort.
- Logikken for ankomst, tidsregistrering, fortryd udførsel, rutens vejgeometri og ETA.

## Test
- Typetjek, build og eksisterende tests for kørsel/ankomst/bevægelse.
- Ny test af kortadapteren: status for stop, oprydning ved skift og skift til reserve ved fejl og timeout.
- Playwright på 390, 768 og 1280 px for layout og reservekort. Selve Google-kortet kan ikke vises i testmiljøet, så du skal prøve det på serviceydere.dk bagefter.

## Krav i Google Cloud (din nøgle)
- Maps JavaScript API skal være slået til på browsernøglen.
- Referrer-reglerne `https://serviceydere.dk/*` og `https://*.serviceydere.dk/*` bevares. Tilføj `*.lovable.app/*`, hvis du også vil se Google-kortet i previewet.
- Uden dette viser appen automatisk reservekortet.

## Tekniske detaljer
- Ny `src/lib/google-maps-loader.ts`: singleton-promise med `loading=async`, global callback, `channel`-tracking-ID, `gm_authFailure`-hook og timeout. Nøglen er `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`.
- Ny `src/components/employee-route/GoogleRouteMap.tsx`: `google.maps.Map` (uden mapId, `clickableIcons:false`, `disableDefaultUI`, gestureHandling "greedy"). `google.maps.Marker` med SVG-ikoner fra den eksisterende `stopIcon`-palet, `Polyline` til preview-, del- og ankomstlinje, og puck-markør drevet af `motionTrack.subscribe` med `setHeading`/`panTo`. Markører diffes efter stop-id, og alt fjernes ved unmount. `ResizeObserver` udløser `trigger(map,'resize')`.
- Props-kontrakt svarer til det nuværende `MapContainer`-indhold (points, stops, nextStopId, highlightedId, legLine, previewLine, followMode, night, onInteract, onSelectStop). Den nuværende Leaflet-blok flyttes uændret til `LeafletRouteMap.tsx` som reserve.
- `EmployeeRoute.tsx` vælger renderer via `useRouteMapProvider()`: google, falling-back, leaflet. Valget gemmes pr. session, så en fejl ikke prøves igen ved hver rendering.
- Natstil som JSON-stilarray afledt af tema-tokens. HUD-zoner sendes som `padding` til `fitBounds`/`panTo`, så næste stop ikke skjules af HUD'en.
- Opdatér AGENTS.md-reglen om night maps/Leaflet til den nye renderer-med-reserve-regel.

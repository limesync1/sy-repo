# Rutekørsel som Google Maps – fuld plan

Mål: Kortet i rutekørsel skal opføre sig så tæt på Google Maps-appens navigation som muligt: samme kort, kamera, bil, rutelinje, vejvisning og mørk tilstand. Kun vores felter (HUD), knapper og stophandlinger ligger ovenpå. Det gamle kort bliver kun brugt som nødløsning.

## 1. Mørk tilstand, der faktisk virker
- Årsagen er ikke bekræftet endnu. Første skridt er at finde ud af, hvorfor kortet bliver lyst om natten. Mulige årsager: Googles testindstilling ignorerer mørkt tema, mørk tilstand skifter ikke korrekt, eller satellit overskriver det.
- Mørk tilstand vælges, når kortet åbner. Skifter man tilstand undervejs, genopbygges kortet hurtigt, uden blink og uden at miste position, zoom og retning.
- Der bruges én egen kortindstilling (Map ID) med en lys og en mørk stil oprettet i Google Cloud, så mørkt tema er garanteret. Indtil den findes, bruges Googles testindstilling, og der vises en tydelig besked, hvis mørkt ikke kan vises.
- Automatisk nat efter solnedgang og solopgang (som i Google Maps). Natknappen kan stadig tvinge lys eller mørk.
- Stopnåle, rutelinje, bilpil og knapper får natfarver med god kontrast.

## 2. Kamera som i Google Maps-navigation
- Kortet vender i kørselsretningen og vippes ca. 45° med bilen nederst på skærmen.
- Zoom følger farten: tæt på i byen, længere ude på landevej. Før et sving zoomes der ind, så man ser krydset.
- Ingen rysten: retningen udglattes, små GPS-hop ignoreres, og kameraet bevæger sig jævnt.
- Holder man stille, låses retningen, så kortet ikke drejer tilfældigt.
- Trækker man i kortet, stopper det med at følge. Knappen «Centrér» genoptager det. Efter 10 sekunder uden berøring vender kortet selv tilbage, som i Google Maps.
- Kompasknap: viser kortets retning, og et tryk skifter mellem «retning op» og «nord op».
- Rutens overblik: knap til at vise hele ruten fladt og nord op, og tilbage til kørsel.

## 3. Bilen
- Én blå pil i en lys cirkel, som i Google Maps. Står man stille, vises en blå prik. Usikker GPS vises som en større, blødere cirkel.
- Pilen glider jævnt mellem GPS-punkter.
- Pilen trækkes ind på vejen, når den er tæt på rutelinjen, så den ikke kører ved siden af vejen.

## 4. Rute og stop
- Rutelinje i Google-stil: blå linje med mørkere kant. Den kørte del bliver grå bag bilen.
- Med trafik slået til farves ruten efter Googles trafik (grøn/gul/rød), hvor data findes.
- Stop: næste stop fremhævet, kommende nummererede, udførte grå med flueben. Start vises som et hus. Alt følger stopstatus præcist, også efter «Fortryd udførsel».
- Destinationsflag og ankomstzone ved næste stop.
- Hvis man kører forkert, beregnes ruten automatisk igen med beskeden «Finder ny rute…».

## 5. Vejvisning (Google Routes)
- Ruter og sving hentes fra Googles egen rutetjeneste i stedet for den åbne tjeneste. Det giver danske instruktioner, vejnavne, vognbaner, trafikbaseret ankomsttid og bedre omkørsler.
- Svingbanner øverst i Google-stil: stor pil, afstand, vejnavn og «Derefter …» for næste sving.
- Ankomsttid, resterende tid og distance opdateres løbende ud fra trafik.
- Hvis Googles rutetjeneste fejler, bruges den åbne rutetjeneste som reserve, uden at medarbejderen mærker det.
- Kald begrænses: kun ved start, afvigelse og hvert par minutter, så det ikke koster for meget.

## 6. HUD og knapper oven på Google-kortet
- Opdelt som Google Maps: svingbanner øverst, kortknapper i højre side (kompas, trafik, satellit, centrér, overblik) og vores ankomst- og handlingspanel nederst.
- Googles logo og vilkår skal altid kunne ses, som Google kræver.
- Rutekortet tilpasses mobil, tablet og computer, både lodret og vandret. Ingen felter dækker bilen eller næste sving.
- Alle knapper testes i lys og mørk tilstand og i alle tilstande (normal, tryk, fokus, slået fra).

## 7. Robusthed
- Lukkes browseren og åbnes igen, kommer kortet tilbage med samme rute, stopstatus og kørselstilstand.
- Kortnøglen og kortindstillingen gemmes kort på enheden, så kortet åbner hurtigt igen.
- Afviser Google kortet eller timeout: det gamle kort vises med «Prøv Google igen». Afvises den drejende visning, vises Google-kortet fladt i stedet for at skifte til det gamle kort.
- Kortet sætter opdateringer på pause, når appen er skjult, og fortsætter ved genåbning.
- Fejl vises på dansk med næste skridt i popups, der ikke dækker vejvisningen.

## 8. Test
- Simuleret kørsel af Patricks testrute (Haderup → Herning) med GPS-afspilning: sving, afvigelse, ankomst ca. 100 m før, udført, fortryd og genåbning.
- Mobil, tablet og computer i lys og mørk tilstand.
- Google-kortet kan ikke vises i mit testmiljø. Den endelige visuelle test sker på serviceydere.dk på din telefon, med en tjekliste.

## Hvad du skal gøre i Google Cloud
1. Kortindstillingen (Map ID) er modtaget. Den bliver gemt og koblet på som det første skridt. Tjek, at den er sat til **JavaScript** og **Vector**, og at **Tilt** og **Rotation** er slået til.
2. Opret en kortstil under **Map Styles** med en lys og en mørk variant, og kobl den til kortindstillingen.
3. Kontrollér, at **Routes API** er slået til på servernøglen, altså den uden website-begrænsning.
4. Sørg for, at fakturering er aktiv, og sæt gerne en budgetalarm under **Billing → Budgets & alerts**.

## Tekniske detaljer
- `GoogleRouteMap`: `mapId` fra `SERVICEYDERE_MAPS_MAP_ID` (via `google-maps-browser-key`), `colorScheme` ved oprettelse, genopbygning ved temaskift med bevaret kamera (`getCenter/getZoom/getHeading/getTilt`), og tilbagefald til raster uden `mapId` ved vektorfejl.
- Kamera: `moveCamera` med udglattet heading (lavpas og dødbånd), fartbaseret zoom med dwell, zoom før manøvre ud fra afstand til næste step, auto-genfølg efter 10 s.
- Puck: Symbol-rotation relativ til `map.getHeading()`, interpoleret via `motionTrack`, snap-to-route inden for 25 m, nøjagtighedscirkel via `google.maps.Circle`.
- Rute: to `Polyline`-lag (kant og fyld) samt kørt del. Trafikfarver via Routes API `travelAdvisory.speedReadingIntervals`.
- Ny edge-funktion `route-directions-google`: Routes API `computeRoutes` via egen servernøgle med connector-fallback, `languageCode: da`, `routingPreference: TRAFFIC_AWARE`, felterne legs/steps/navigationInstruction/polyline/duration. Samme svarformat som `route-directions`, som bevares som reserve. Login kræves og inputtet begrænses.
- Rydder ubrugt `nightStyles` og gammel Leaflet-specifik HUD-logik, der ikke gælder for Google.
- Opdaterer AGENTS.md-kortreglen.

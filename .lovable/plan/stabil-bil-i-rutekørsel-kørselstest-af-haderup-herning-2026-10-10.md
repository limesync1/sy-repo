# Stabil bil i rutekørsel + kørselstest af Haderup–Herning

## Det jeg fandt i koden (derfor hopper bilen)
1. **Bilen trækkes ind på vejen eller slippes igen ved præcis 25 m.** Svinger GPS'en omkring 25 m fra linjen, skifter bilen frem og tilbage mellem vejen og den rå position.
2. **Bilen kan trækkes ind på den forkerte del af ruten.** Den nærmeste del af hele strækningen vælges, også en parallel vej, den modsatte side af en rundkørsel eller et sted, man allerede har kørt.
3. **Når man selv flytter kortet, springer bilen fra GPS-punkt til GPS-punkt** uden glidende bevægelse.
4. **Kameraet kører i ryk.** Det bevæger sig i 0,45 sekund og står derefter stille i ca. 0,4 sekund. Bilen står fast på skærmen, så det er kortet, der rykker.
5. **Ingen afvisning af umulige spring.** Et enkelt GPS-punkt 150 m væk (bygninger, tunnel) godtages, hvis den angivne nøjagtighed ser god ud.
6. **Efter 5 sekunder uden GPS starter alt forfra** med den rå position. Det giver et hop efter tunneler og ved dårlig dækning.
7. **Stillestående tilstand slippes med et ryk.** Bilen fryses på et gennemsnit og hopper, når man kører igen.
8. **Retningen har tre kilder, der ikke er enige:** GPS, en lige linje mod næste stop (peger hen over marker) og kameraets egen udglatning. Derfor peger bilen og kortet ikke altid samme vej.

## 1. Én fælles "positionsmotor" (som i Google Maps)
Bil, kamera, ankomst og ETA bruger samme beregnede position:
- **Bilen følger vejen, ikke prikkerne.** Når man er på ruten, flytter bilen sig kun langs rutelinjen målt i kørte meter. Den kan ikke springe sidelæns, og retningen er vejens retning.
- **Fremad, aldrig baglæns.** Positionen på ruten går kun tilbage, hvis flere GPS-punkter i træk bekræfter det (vending).
- **Søg kun i nærheden.** Næste position søges i et vindue omkring den nuværende, så rundkørsler, motorvejsramper og parallelle veje ikke forveksles.
- **Glidende overgang ved trækning ind på vejen og ud igen:** Bilen trækkes ind under 20 m og slippes først over 45 m efter 3 punkter i træk. Derefter vises "Finder ny rute…".
- **Umulige spring afvises.** Punkter, der kræver en urealistisk fart, ignoreres, medmindre det næste punkt bekræfter dem.
- **Bilen fortsætter mellem GPS-punkter** med den kendte fart langs vejen, højst 1,5 sekund frem. Det sker, så den ikke står og venter på næste punkt.
- **Huller i GPS (tunnel, dårlig dækning):** Bilen kører videre langs vejen i op til 10 sekunder og bliver gradvist nedtonet. Når GPS kommer igen, glider den på plads, eller springer direkte, hvis forskellen er stor.
- **Holder stille:** Bilen står helt stille under ca. 3 km/t og bevarer sin retning. Når man kører igen, starter den blødt fra samme sted.

## 2. Roligt kamera
- Kameraet følger motorens position løbende i stedet for at rykke ca. én gang i sekundet.
- Kortet drejer kun med vejens retning og højst et begrænset antal grader pr. sekund. Det sker, så skarpe sving ikke svirper.
- Brugerens zoom og "Centrér" virker som nu. Når appen åbnes igen, springer bilen stadig direkte til den aktuelle position.

## 3. Alle scenarier, der testes automatisk
Rundkørsel, vending, parallel vej og motorvejsrampe, tunnel (15 s uden GPS), bygninger med spring på 150 m, rødt lys, parkeringsplads, start indendørs, dårlig nøjagtighed, telefon uden retning og fart (iPhone), punkter i forkert rækkefølge eller dubletter, ny rute midt i et sving, appen i baggrunden og ankomst ca. 100 m før stop.

## 4. Kørsel af Haderup–Herning
Jeg kan ikke selv køre bil. Kortet viser derfor afvigelser på to måder:
- **Simuleret kørsel nu:** Rutens rigtige veje hentes. Der laves et realistisk GPS-spor med støj, huller og spring, som afspilles gennem appen. Du får en rapport pr. strækning med bilens afvigelse fra vejen i meter, forkert retning, steder hvor rutelinjen ikke følger vejen, ETA i forhold til simuleret tid og stop med forkerte koordinater. Skolegade 7 og Navervej 18 er allerede mistænkte og bliver geokodet igen med Google.
- **Din rigtige kørsel:** En valgfri "Optag kørsel"-funktion gemmer GPS-punkter og bilens viste position, mens du kører. Bagefter vises et kort, hvor de to spor ligger oven på hinanden, og afvigelser over 15 m er markeret. Optagelser slettes automatisk efter 14 dage. Kun du og virksomhedsejeren kan se dem.

## Hvad der ikke ændres
Manuel tidsregistrering, ankomstreglen på ca. 100 m, stophandlinger, HUD-layout, Google Routes-vejvisning med OSRM som reserve.

## Tekniske detaljer
- Ny `src/components/employee-route/positionEngine.ts` (ren, testbar): kortmatchning på `legLine` med søgevindue omkring `progressM`, hysterese (20/45 m, 3 punkter), monoton progress, afvisning af outliers via implicit fart (> max(45 m/s, 2,5×fart+15)), konstant hastighed langs polylinjen (maks 1,5 s), dead-reckoning i tunnel (maks 10 s) og heading fra vejsegmentet. Outputtet er `{pos, heading, progressM, onRoute, confidence}`.
- `useGpsFilter` reduceres til rensning (dubletter, rækkefølge, outliers). EMA og stillestående anker erstattes af motoren. Ingen nulstilling ved 5 s; motoren bestemmer, om der glides eller springes.
- `MotionTrack` udskiftes med motorens rAF-sampling (25 fps), som både kamera og puck abonnerer på. Puck i fri tilstand bruger samme sample, ikke `userPos`.
- `GoogleRouteMap`: følgekamera bruger `moveCamera` pr. frame fra samme sample med begrænset vinkelhastighed. `snapToLine` og `nextHeading` fjernes. `derivedHeading`s fallback "mod næste stop" fjernes.
- Afvigelse fra ruten (reroute) udløses af motorens `onRoute=false` i stedet for den nuværende afstandstjek.
- Simulering: `scripts/simulate-drive.ts` henter vejgeometri, genererer et spor med støjprofiler og afspiller det gennem motoren. Rapporten gemmes i `/mnt/documents/haderup-herning-afvigelser.md` sammen med et kortbillede. Playwright afspiller samme spor via mocket geolocation på reservekortet.
- Optagelse: tabellen `route_drive_traces` (route_id, employee_id, punkter som jsonb, expires_at) med RLS for medarbejder/ejer og daglig sletning. Upload sker i batch hvert 30. sekund og kun når optagelse er slået til.
- Vitest-scenarier for alle punkter i afsnit 3. AGENTS.md: én regel om, at positionsmotoren er eneste kilde til bilens position.

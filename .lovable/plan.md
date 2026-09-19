# Medarbejder-rutekørsel, ruteoptimering og testfase-popup

Fem sammenhængende forbedringer. Jeg har allerede fundet de konkrete årsager til de fejl, du beskriver.

## 1. Testfase-popup'en

Den bliver skrevet om til noget der ligner en rigtig produktbesked i stedet for en standard-dialog:

- Rolig, lys kortflade i sidens egen palet (marine/teal), ikke et ikon-i-cirkel-mønster.
- Kort overskrift, én linje brødtekst, e-mail-felt og én knap. Rollevalget (kunde / virksomhed) bliver to små diskrete valg under feltet i stedet for to store klodser øverst.
- Blødere indgang (fade + let løft), pænere kvitteringstilstand efter tilmelding, og samme udseende på 375 px som på desktop.
- Stribens tekst og popup'ens tekst bliver ens formuleret, så det ikke føles som to forskellige beskeder.

## 2. Fejlene under kørsel af ruter

Det du ser som "+258 min ved 23,6 km" er ikke køretid — det er hvor meget man er bagud i forhold til planlagt ankomst, men det står lige under kilometertallet uden forklaring. Det bliver rettet:

- Forsinkelsestallet får sin egen tydelige mærkat ("bagud" / "i god tid") og vises kun når der er en reel planlagt ankomst at måle imod.
- Ankomsttid, afstand og resterende tid bliver adskilt visuelt, så tre tal aldrig kan forveksles.
- Kortet: fejl ved indlæsning af kort/rutelinje viser i dag ingenting. Det får en synlig tilstand med "Prøv igen", og ruten falder tilbage til en lige linje mellem stoppene, så man aldrig står med et tomt kort.
- Fejlhåndtering hele vejen igennem: manglende GPS-tilladelse, tabt netværk, adresse uden koordinater og mislykket "markér udført" får konkrete danske beskeder med en handling — i stedet for stilhed.
- Trafikadvarsler får en øvre fornuftsgrænse, så en dårlig GPS-måling ikke kan udløse "forsinkelse på 258 minutter" i tale eller tekst.

**Strøm og varme.** Årsagen er, at kortet, positionsudglatningen og ETA-opdateringen kører konstant. Det bliver:
- Positionssporing skruet ned til én opdatering hvert par sekunder i stedet for hver eneste GPS-hændelse.
- Kortanimation og genoptegning sat på pause, når skærmen/fanen ikke er synlig, og når man holder stille.
- ETA hentes efter afstand tilbagelagt i stedet for efter fast timer.
- En diskret strømsparetilstand (kort fryses, kun liste og næste manøvre) som man selv kan slå til.

## 3. Gamification ved udført aftale

Når en aftale markeres som udført under kørsel: kort haptisk feedback, en tilfredsstillende animation på stoppet, tæller "3 af 7 klaret" med fremdriftslinje, og en afsluttende opsummering når sidste stop er lukket (antal stop, km, tid, dagens streak).

## 4. "Optimér rute" optimerer ikke køretid

Den rigtige årsag: optimeringen henter kun en rigtig køretidsmatrix ved 25 stop eller færre. Derover regner den med fugleflugtsafstand og faste 50 km/t — så rækkefølgen bliver optimeret efter afstand, ikke efter hvor hurtigt man reelt kommer frem.

- Køretidsmatrixen bliver hentet i bidder, så også ruter med mange stop optimeres på faktiske køretider.
- Falder alle opslag fra, siger den det tydeligt ("beregnet uden trafikdata") i stedet for at lade som om resultatet er præcist.
- Vægtningen mellem km og minutter bliver justeret, så tid vejer tungest — det er det knappen lover.
- Resultatet vises som før/efter: km og minutter sparet, med mulighed for at fortryde.

## 5. Valg af virksomhed og enklere rutekørsel på mobil

- Virksomhedsvælgeren bliver lavet om til fuldskærms-ark på mobil med store trykflader, logo, navn og adresse — i stedet for en smal liste.
- Når man starter en rutekørsel, kommer der et valg: **Tjekliste** (bare stoppene i rækkefølge, tryk "Udført") eller **Kørselsguide** (kortet med navigation som i dag). Valget huskes pr. medarbejder og kan skiftes undervejs.
- Tjeklistetilstanden bruger stort set ingen strøm — intet kort, ingen løbende GPS.
- Hele kørselsvisningen bliver forenklet: ét tydeligt "næste stop"-kort, én primær handling, resten bag et enkelt tryk.

## Tests

- Enhedstests for køretidsberegning, forsinkelse, format og trafikadvarslens grænser.
- Optimeringstests: faste scenarier (by, blandet, langtur, mange stop) som måler km og minutter før/efter og fanger, hvis matrixen falder tilbage til fugleflugt.
- Browsertests på 375 px og tablet: valg af tilstand ved rutestart, gennemført tjekliste, kortfejl-tilstanden, virksomhedsvælgeren.
- En målt gennemkørsel af kortvisningen, der tæller genoptegninger pr. minut, så strømforbedringen kan dokumenteres.

## Teknisk

- `EmployeeRoute.tsx` deles op: `RouteChecklistView` og `RouteNavigationView` bag en fælles `RouteRunShell` med tilstandsvalg (gemt i `localStorage` pr. medarbejder).
- `delayMinutes` (linje ~835) flyttes ud i egen mærket komponent; trafikdelta får loft.
- `useSmoothPosition`/`useGpsFilter`: throttling via `requestAnimationFrame` + `document.visibilityState`; kortet pauses ved skjult fane.
- `route-directions`: uændret trafikmodel, men fejl returneres eksplicit til klienten, som nu viser dem.
- `optimize-route/geo.ts`: `buildMatrix` opdeles i 25×25-bidder og sammensættes; `vrp.ts` justerer `KM_COST_WEIGHT` mod tid; ny `matrix_source` i svaret.
- Vitest: `src/pages/employee-route/*.test.ts`, `supabase/functions/optimize-route/vrp_test.ts` udvides. Playwright: `e2e/employee-route.spec.ts`.

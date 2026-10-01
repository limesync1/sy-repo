# Rutekørsel, Min dag, ruteplanlægger på mobil, Regnskab og smartere Leads

## 1. Rutekørsel (kort og tjekliste) i panelets design
- Begge visninger får samme opbygning som panelerne: enkelt sidehoved (rutenavn, "Stop 2 af 6", fremdriftslinje), samme kort, knapper og afstande.
- Én tydelig hovedknap ad gangen, styret af stoppets tilstand:
  - Ikke ankommet: **Navigér hertil**
  - Ankommet, ikke startet: **Start aftale**
  - I gang (timer kører HH:MM:SS): **Afslut aftale**
  - Udført: **Næste stop**
- "Markér som udført" vises aldrig før aftalen er startet. Udførsel uden tidsregistrering ligger kun i en "Flere muligheder"-menu.
- Kortvisningen får et bundpanel i samme stil som tjeklistens næste-stop-kort (adresse, kunde, ring/navigér, noter) og kan trækkes op til stop-listen. Skift mellem kort og tjekliste via en fast knap øverst.
- Store berøringsflader (min. 48 px) og større tekst, så det er nemt for ældre brugere.

## 2. Min dag
- Kun én knap pr. rute: **Start rute** hvis ingen stop er påbegyndt, ellers **Fortsæt rute (stop 3 af 6)**. Fjern den dobbelte knap.
- Rutekortet viser: navn, antal stop, fremdrift, næste adresse, status-mærke (Ikke startet / I gang / Færdig). Ingen forventede tidspunkter.

## 3. Ruteplanlæggeren på mobil (virksomhedspanel)
- **Fortryd udførsel** tilføjes i stoppets menu og detaljevindue på mobil (findes kun på desktop i dag), med bekræftelse.
- Mobilflow forenkles: dato-vælger + rute-faner øverst, stop som liste med stor handlingsmenu pr. stop, kort som separat fane, flyt stop via "Flyt op/ned/til anden rute" i stedet for kun træk-og-slip.

## 4. Regnskab-ikonet loader langsomt
- Ikonet forudindlæses sammen med panelet og får fast størrelse med en stille pladsholder, så det vises med det samme.

## 5. Leads: smartere og automatiseret
Undersøger konkret hvordan fx Pipedrive, HubSpot, Leadfeeder, Meta Lead Center, 3byggetilbud/Anbudstorvet og Bark håndterer leads, og bygger videre på det bedste:
- **Brancher:** forudfyldes automatisk med virksomhedens egne services; slå til/fra med ét tryk i stedet for at skrive.
- **Maks afstand:** udgangspunkt i virksomhedens adresse, skyder med forslag ("Hele Midtjylland ≈ 60 km") og visning af hvor mange af de seneste leads der ville være faldet indenfor.
- **Auto-svar:** forklaret i klart sprog med forhåndsvisning af beskeden kunden modtager, færdige skabeloner og valg af hvornår det sendes (straks / kun udenfor åbningstid).
- **Ekstra modtagere:** forslag fra virksomhedens medarbejdere med ét tryk.
- **Leads-siden:** status-pipeline (Ny, Kontaktet, Tilbud sendt, Vundet, Tabt), automatisk prioritet (afstand, service-match, alder), påmindelse når en lead ikke er besvaret inden for en tid, svartids-nøgletal, AI-svarudkast, hurtig omdannelse til kunde/aftale, søgning og filtre.
- **Forbind Meta:** tydelige danske fejlbeskeder pr. årsag (ikke sat op endnu, mangler adgang, forbindelsen udløbet, Meta afviste) i et vindue med næste skridt, i stedet for en generel fejl. Knappen viser "Ikke tilgængelig endnu", indtil Meta-oplysningerne er tilføjet.

## Tekniske detaljer
- `EmployeeRoute.tsx` (2.528 linjer) opdeles: fælles `useStopState` til hovedknap-logik, nye `RouteMapSheet` og `RouteHeader`, genbrugt af `RouteChecklistView`.
- `EmployeeApp.tsx`: CTA beregnes fra `employee_completed_stops`/`stop_time_entries`.
- Ruteplanlæggerens fortryd bruger den eksisterende uncomplete-funktion; kun UI tilføjes på mobil.
- Leads: nye kolonner til pipeline-status/prioritet på `quote_request_matches` (migration med GRANTs/RLS), `LeadSettingsDialog` læser services og medarbejdere; `meta-oauth-start` returnerer `reason`-koder, som klienten oversætter.
- Kontrol med Playwright på 393 px, 1280 px og 1440 px samt typecheck.

Meta-forbindelsen virker stadig først, når Meta App-oplysningerne er tilføjet.

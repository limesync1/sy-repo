# Ruteplanlægger — fejlgennemgang og forbedringer

Jeg har gennemgået hele ruteplanlæggeren (siden, komponenter, hooks og domænelogik), kørt testene og typetjek. Typetjek er rent, og 127 af 128 tests består (den ene fejler kun på grund af en databaserettighed i test-sandkassen, ikke en fejl i koden).

Der er ingen kritiske nedbrud, men der er en række reelle fejl og huller, jeg foreslår at rette.

## 1. Fejl der bør rettes

**Tastaturgenveje kan arbejde på forældet markering**
Escape-genvejen læser rutens/stoppets markering fra en forældet kopi, så den i visse tilfælde rydder det forkerte (eller intet). Rettes ved at lægge markeringerne i refs, som resten af hooken allerede gør.

**Autosave i stop-panelet reagerer ikke på skift af skrivebeskyttelse**
Går et stop fra låst til redigerbart, gemmes allerede ændrede felter først ved næste tastetryk.

**Drag-timere ryddes ikke ved at forlade siden**
Validerings- og simuleringsforhåndsvisning bruger timere på modulniveau. Navigerer man væk midt i et træk, kan en gammel tilstand blive vist, hvis man går tilbage igen. Rettes med oprydning ved unmount.

**Ingen fejltilstand når data ikke kan hentes**
Kalender og "aftaler uden rute" viser en tom liste, hvis hentningen fejler — det ligner en tom kalender i stedet for en fejl. Tilføjer fejlbesked med "Prøv igen".

**Kopiér-knap fejler lydløst**
Diagnostik-kopiering swallow'er fejl uden besked til brugeren.

## 2. Ydelse

**Træk-overlay opdaterer ved hver musebevægelse**
ETA-overlayet lytter uthrottlet på musebevægelser og re-renderer 60-120 gange i sekundet under træk. Rettes med rAF-throttling, samme mønster som auto-scroll allerede bruger.

**Lange lister uden virtualisering**
"Aftaler uden rute" renderer alle kort på én gang. Ved mange uplanlagte aftaler giver det mærkbart lag. Tilføjer virtualisering (eller som minimum "vis flere"-paginering) på den liste.

## 3. Tilgængelighed

- Tilføj en `aria-live`-region der annoncerer træk-handlinger ("Aftale flyttet til rute X"), så tastatur- og skærmlæserbrugere får samme feedback som toasten giver visuelt.
- Gennemgå `aria-label` på dag-celler og rute-pills, som i dag er drop-mål uden beskrivende navn.

## Teknisk

- `useRoutePlannerKeyboard.ts`: markeringer via refs, komplet dependency-array.
- `StopDetailSheet.tsx`: tilføj `readOnly` til autosave-effektens deps.
- `drag-validation-context.tsx` / `simulation-preview-context.tsx`: eksportér `cancelPendingWrite()` og kald den i `useRoutePlannerDnd` cleanup.
- `DragEtaOverlay.tsx`: rAF-throttle `pointermove`.
- `RoutePlanner.tsx`: brug `isError` fra `useCalendarData` og `useUnassignedJobs`; virtualiser den uplanlagte liste.

Ingen ændringer i databasen eller forretningslogik — kun frontend-fejlrettelser, ydelse og tilgængelighed.

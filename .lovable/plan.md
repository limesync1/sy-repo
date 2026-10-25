# Gennemgang og rettelser i ruteplanlæggeren

## Bekræftet fejl
«Tilføj aftale til rute» viser alle ruter, der er hentet til kalenderen. Der er intet filter for tidligere datoer, arkiverede ruter eller ruter, der allerede er helt udført. Derfor dukker gamle ruter op.

## Rettelser
1. **Tilføj aftale til rute**: vis kun ruter fra i dag og frem, som ikke er arkiveret og ikke er helt udført. Sorteret med nærmeste dato først. Den rute, man åbnede vinduet fra, står stadig øverst. Teksten for en tom liste forklarer hvorfor («Ingen kommende ruter …»).
2. **Samme regel i alle vælgere i ruteplanlæggeren**: flyt ruter, flyt dato, flyt stop til anden rute, sygemelding/omfordeling, dagsoptimering og print. Hver af dem tjekkes for gamle, arkiverede, tomme eller forventede (ikke-oprettede) ruter, der ikke hører hjemme dér. En fælles regel bruges, så de ikke kan komme til at vise forskellige ting.
3. **Systematisk gennemgang** (mobil og computer, lyst og mørkt tema): kalender, rutevindue, stop, aftaler uden rute, forventede ruter, træk og slip samt alle vinduer. Fejl, der findes, rettes i samme omgang. Det gælder fx udførte stop, tomme ruter, kørselstal, forkerte tællere og ruter, der ikke opdateres efter en ændring.
4. **Test**: automatiske test af reglen «hvilke ruter må man vælge» (fortid, arkiveret, udført, forventet, i dag). Derefter en klikgennemgang i browseren med en rigtig konto.

## Uden for planen
Ingen nye funktioner, intet nyt design og ingen ændring af gemte data.

## Teknisk
- Ny hjælper `src/lib/route-planner/selectable-routes.ts`: `isSelectableTargetRoute(route, today)` (route_date >= dagens dato i Danmark, ikke `archived_at`, ikke `isVirtual`, ikke fuldt udført).
- Bruges i `RoutePlanner.tsx` (BulkAddToRouteDialog-props ca. linje 4654, BulkMove/MoveStop/sygemelding/optimering) i stedet for at bruge `calendarRoutesRaw` direkte.
- Vitest-test ved siden af hjælperen; Playwright-gennemgang ved 390/768/1280 px.

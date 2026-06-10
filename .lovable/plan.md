# Plan: Rute- og medarbejderforbedringer

## 1. Auto-opdatér ruteplanlægger når aftaler slettes
Når en aftale slettes (i `CustomersTab`/`OrderTimeline`/agreement-flow), invalideres `["agreements"]` / `["orders"]`, men **ikke** `["routes"]`, `["route-stops"]`, `["unassigned-jobs"]` eller projection-cachen. Derfor forsvinder ruterne først ved hard reload.

**Fix:** Find alle steder hvor aftaler/ordrer slettes og kald `invalidateRouteSyncQueries(qc)` (eksisterer allerede i `useRoutes.ts`). Tilføj samme invalidering på `agreement_occurrences`-sletninger og på den realtime-kanal for `agreements`/`orders` så åbne planlægger-faner opdateres automatisk uden F5.

## 2. "Åben rute" lukker straks + lag på historik
- "Åben rute" via `RouteContextMenu` triggers Radix `DropdownMenu`'s `onSelect`. Eventet bobler ud som `pointerdown-outside` på det netop-åbnede `Sheet` (samme klasse problem som vi fiksede sidst, men context-menu-pathen mangler). **Fix:** I `RouteContextMenu` kald `e.preventDefault()` på `onSelect` og åbn `Sheet` i en `setTimeout(0)`/`requestAnimationFrame` så menuens close-event ikke når den nye sheet. Alternativt: udvid `onPointerDownOutside`-guarden i `RouteEditSheet` til også at ignorere `[role="menuitem"]` / `[data-radix-dropdown-menu-content]`.
- `RouteHistoryDialog` lagger fordi den henter alt audit-log + snapshots synkront og re-renderer ved hvert keystroke. **Fix:** Memoisér listen, virtualiser med `react-window` (eller paginer 50 ad gangen), og lazy-load dialogen via `React.lazy` så koden ikke parses før brugeren åbner den.

## 3. "Lås rute som snapshot" — gør betydningen klar eller fjern
`RouteSnapshotSection` i `RouteEditSheet.tsx` lader brugeren fryse den aktuelle rute-tilstand som immutable historik. Det er en intern audit-feature, ikke noget den almindelige bruger har brug for.

**Beslutning:** Skjul knappen bag en "Avanceret"-toggle og omdøb den til **"Gem som referencepunkt"** med en kort hjælpetekst: *"Gemmer et øjebliksbillede du senere kan sammenligne med — bruges til revision."* For ikke-admin roller skjules sektionen helt.

## 4. Tydeligere "udført"-status på rutekort
I dag vises kun et lille grønt `"3/5"`-tal. **Forbedringer i `MonthWeekCalendar.tsx` (RoutePill) + `AgendaCalendar.tsx`:**
- Tilføj en tynd **progress-bar** i bunden af pillen (`completed/total`) i emerald.
- Når 100% udført: pille får emerald venstre-rail + lille `CheckCircle2`-ikon + dæmpet baggrund + badge "Udført".
- I uge/måned-grid: vis cirkulær progress-ring rundt om stop-tæller.
- Samme behandling i `UnassignedJobCard` / `RouteStopsPanel` for konsistens.

## 5. Medarbejder: kunne se men ikke udføre fremtidige/forrige dage
`EmployeeApp.tsx` viser allerede andre datoer (date-navigator findes), men CTA'er (`Start dag`, `Start stop`, `Marker udført`) er kun aktive når `isCurrentDay`. Sektionen omkring linje 537 nævner allerede "låst"-tilstand.

**Fix:**
- Gør ALT data-visning (rute, stops, kort, statistikker) tilgængelig for alle datoer — ingen tomme states pga. dato.
- For `!isCurrentDay`: vis read-only-tilstand med tydeligt lås-badge ("Låst — kun visning. Bliver tilgængelig [dato]") og deaktiver alle handlings-knapper.
- For fortid: vis statistikker (varighed, antal udførte stop, omsætning) i en kompakt "Dagsrapport"-card øverst.

## 6. Tillad tidlig udførelse — generel + per-medarbejder + per-rute
Ny indstilling: **"Tidlig udførelse"** med 3 lag i prioritetsorden (mest specifikke vinder):

1. **Rute-niveau** (`routes.allow_early_completion boolean`) — togglede i `RouteEditSheet`.
2. **Medarbejder-niveau** (`employees.early_completion_mode enum: 'inherit' | 'always' | 'never'`) — vises i `EmployeesTab` som dropdown pr. medarbejder.
3. **Virksomheds-niveau** (`businesses.allow_early_completion_default boolean`) — global toggle i Indstillinger → Medarbejdere.

**Resolution-funktion** (`canCompleteEarly(routeId, employeeId)`):
```
route.allow_early_completion === true  → tillad
employee.early_completion_mode === 'always' → tillad
employee.early_completion_mode === 'never'  → afvis
business.allow_early_completion_default     → fallback
```

**UI i EmployeesTab:** Ny sektion "Tilladelser" pr. medarbejder-kort med segmenteret kontrol (`Arv fra virksomhed` / `Altid tilladt` / `Aldrig tilladt`) + tooltip-forklaring.

**UI i RouteEditSheet:** Lille switch "Lås op for tidlig udførelse" i rute-indstillinger.

**UI i EmployeeApp:** Når `canCompleteEarly` er true for fremtidig dato → vis et `Unlock`-badge "Låst op af virksomhed" og aktiver CTA'erne på den dato.

## Teknisk

### Migration
```sql
ALTER TABLE businesses    ADD COLUMN allow_early_completion_default boolean NOT NULL DEFAULT false;
ALTER TABLE employees     ADD COLUMN early_completion_mode text NOT NULL DEFAULT 'inherit'
  CHECK (early_completion_mode IN ('inherit','always','never'));
ALTER TABLE routes        ADD COLUMN allow_early_completion boolean NOT NULL DEFAULT false;
```
RLS uændret — felterne arver eksisterende politikker.

### Filer der redigeres
- `src/hooks/useRoutes.ts` — tilføj invalidering på agreement-delete + nye SQL-felter i selects
- `src/components/admin/CustomersTab.tsx`, `OrderTimeline.tsx`, `RouteEditSheet.tsx` — kald `invalidateRouteSyncQueries` ved aftale-delete
- `src/components/route-planner/RouteContextMenu.tsx` — `preventDefault` + deferred open
- `src/components/route-planner/RouteEditSheet.tsx` — udvid outside-guard; ny `RouteEarlyCompletionToggle`; gating af snapshot-sektion
- `src/components/route-planner/RouteHistoryDialog.tsx` — virtualisering + lazy import
- `src/components/route-planner/MonthWeekCalendar.tsx`, `AgendaCalendar.tsx`, `UnassignedJobCard.tsx`, `RouteStopsPanel.tsx` — progress-bar + completed-styling
- `src/components/admin/EmployeesTab.tsx` — ny "Tilladelser"-kontrol
- `src/pages/Admin.tsx` (settings-sektion) — global toggle
- `src/pages/EmployeeApp.tsx` — read-only-tilstand for andre datoer + `canCompleteEarly`-resolver + lås-badges
- Ny `src/lib/early-completion.ts` — resolver-funktion

### Tests
- Unit-tests for `canCompleteEarly` resolver med alle 3*3 kombinationer
- Integration: slet aftale → forventer ruter invalideret uden reload

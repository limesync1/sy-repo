# Smarte forbedringer til ruteflytning (basis + projiceret)

Alle fire forbedringer bygges, så de fungerer ensartet for **både basisruter og projicerede ruter**. Fælles bygge­blokke deles på tværs så UX og kode forbliver konsistent.

## 1. Undo / fortryd flytning
- Efter en vellykket flytning (basisrute eller projektion) vises en sonner-toast med "Fortryd"-knap i 10 sek.
- Ny utility `src/lib/route-undo.ts` med en lille in-memory stack der husker sidste mutation (route_id, fra-dato, til-dato, evt. exception_id, sync-flags).
- For basisruter: revert ved at sætte `route_date` tilbage + nulstil tilbageshiftede aftaler (samme RPC kaldt baglæns).
- For projicerede: slet/rebland den `route_exceptions`-row der lige blev oprettet (ny RPC `revert_projected_shift(_exception_id uuid)`).
- Hook `useRouteUndo()` eksponerer `register()` + `undo()`; integreres i `RoutePlanner`, `RouteEditSheet`, `MoveRouteDateDialog`, `MoveProjectedOccurrenceDialog`.

## 2. Bulk-flyt flere dage
- Ny multi-select tilstand i kalenderen (`AgendaCalendar` + `MonthWeekCalendar`): hold Shift/Ctrl eller klik på en ny "Vælg flere"-knap i toolbaren for at markere flere ruter/projektioner.
- Floating action bar viser antal valgte + "Flyt valgte ±N dage".
- Ny dialog `BulkMoveRoutesDialog` der validerer hver flytning (konflikter, helligdage, serie-kollisioner) via eksisterende `validateRouteMove` + viser per-rute status (OK / advarsel / blokeret).
- Eksekvering: én batched mutation pr. rute med progress-bar; fejl ruller tilbage successfully flyttede via Undo-stacken.

## 3. Smart medarbejder-omfordeling
- Ny utility `src/lib/employee-reassign.ts`: givet nyt rute-datointerval + tildelte medarbejdere, returnér første ledige kollega pr. konfliktende stop (baseret på `useDayConflicts` + medarbejder­tilgængelighed/skills hvis tilgængelig).
- Når flytning (basis eller projiceret) detekterer medarbejder­konflikt, viser dialogen "Tildel **Anna** i stedet for Peter" med ét-klik accept før bekræft.
- Sker også automatisk hvis brugeren vælger "Foreslå" — ellers bevares original tildeling og kun en advarsel vises.

## 4. Visuel drag-preview med konfliktfarve
- Under drag-and-drop af både basisruter og projicerede ruter beregnes pr.-dato status i memo: grøn (ledig), gul (advarsel: helligdag/geografisk spring), rød (blokeret: kollision/fortid/serie-konflikt).
- Kalender-cellerne får baggrunds-ring i den farve mens drag er aktiv (uden at flytte indhold), inkl. lille badge med årsag på hover.
- Logikken samles i `useDragTargetStatus(date)` hook der genbruger `validateRouteMove` + `useDayConflicts`.

## Tekniske ændringer

**Nye filer**
- `src/lib/route-undo.ts` — undo-stack + hook
- `src/lib/employee-reassign.ts` — foreslå ledig medarbejder
- `src/hooks/useDragTargetStatus.ts` — pr.-dato konfliktstatus
- `src/components/route-planner/BulkMoveRoutesDialog.tsx`
- `src/components/route-planner/BulkSelectionBar.tsx`
- `supabase/migrations/<ts>_revert_projected_shift.sql` — RPC til at fortryde projiceret exception + RPC `bulk_shift_routes` der validerer atomisk

**Opdaterede filer**
- `src/pages/RoutePlanner.tsx` — wire multi-select, undo, drag-status
- `src/components/route-planner/AgendaCalendar.tsx` + `MonthWeekCalendar.tsx` — multi-select UI + drag-target farver
- `src/components/route-planner/RouteEditSheet.tsx` — undo-trigger, reassign-forslag
- `src/components/route-planner/MoveRouteDateDialog.tsx` + `MoveProjectedOccurrenceDialog.tsx` — vis reassign-forslag + indkald undo ved success
- `src/hooks/useRoutes.ts` — eksporter `revertProjectedShift` + `bulkShiftRoutes`

## Rækkefølge
1. Migration (RPC'er) — kræver godkendelse
2. Fælles utilities + hooks
3. Dialoger og UI-integration
4. Drag-target farver
5. Manuel verificering i preview

Ønsker du jeg går i gang med migration først?

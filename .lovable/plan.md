# #5 Bulk-stop handtering — plan

Vi tilføjer multi-select for **stop inde i ruter** (i kalenderen) og en **bulk-til-rute-dialog** for **uplanlagte aftaler**. Begge får samme grundmønster som eksisterende bulk-rute-flyt: synlig action-bar, dialog, serial mutation queue med progress.

## Del A — Multi-select af stop i ruter

**Selection state** (`useRouteSelection`):
- Ny `selectedStopIds: Set<string>`, `toggleStopSelection`, `clearStopSelection`.
- Ryddes når kalender-vindue eller view skifter (samme mønster som ruter).
- `lastSelectedStopIdRef` til Shift+klik område-valg inden for samme rute.

**Interaktion i kalenderen**:
- `EmployeeColumn` / `CalendarPlanner` stop-rækker: `⌘/Ctrl+klik` toggler, `Shift+klik` udvælger område inden for samme rute. Almindelig klik = single-select (uændret).
- Visuelt: valgte stop får ring + checkbox-ikon i venstre kant (genbruger eksisterende `isSelected`-styling som basis).

**Action-bar** (under den eksisterende rute-action-bar):
- "N stop valgt" + knapper: **Flyt til rute…**, **Slet**, **Ryd**.
- "Flyt til rute…" åbner ny `BulkMoveStopsDialog`:
  - Vælg mål-rute (dropdown filtreret pr. dato/medarbejder, viser kapacitet/konflikter).
  - Optional position (slut/start/efter valgt stop).
  - Synlig advarsel hvis flytning skaber konflikt (genbruger `detectConflicts`).
- "Slet" → bekræftelses-AlertDialog → seriel sletning via `routeMutationQueue` med progress-toast.

**Mutation flow**: hver stop kører som separat `useAddStop`-flytning eller `useDeleteStop` gennem `routeMutationQueue.run(..., { claim })`, så vi får retry + idempotency.

## Del B — Bulk uplanlagte aftaler → eksisterende rute

Vi har allerede `selectedJobIds`, `runBulkAutoAssign`, `runBulkCancel`. Tilføjer:
- **Ny knap** i job-action-baren: **Tilføj til rute…**.
- Ny `BulkAddToRouteDialog`:
  - Rute-vælger (dato + navn + medarbejder + ledig kapacitet).
  - Preview-liste af valgte aftaler med adresse/varighed.
  - Synlig advarsel hvis samlet varighed > rutens ledige tid.
  - Confirm → seriel `useAddStop` pr. aftale gennem `routeMutationQueue`, progress-toast.
- Efter succes: ryd valg, invalider queries, vis success-toast med rute-link.

## Tekniske detaljer

**Nye filer**:
- `src/components/route-planner/BulkMoveStopsDialog.tsx`
- `src/components/route-planner/BulkAddToRouteDialog.tsx`

**Ændrede filer**:
- `src/hooks/route-planner/useRouteSelection.ts` — tilføj stop-selection.
- `src/pages/RoutePlanner.tsx` — handlers, dialog-mount, action-bars, prop-tråding.
- `src/components/route-planner/CalendarPlanner.tsx` + `EmployeeColumn.tsx` — modtag `selectedStopIds`, `onToggleStopSelection`, render selection styling.
- `src/hooks/route-planner/useRoutePlannerKeyboard.ts` — Escape rydder også stop-valg; Delete sletter alle valgte stop hvis >1.

**Mutation pattern** (genbrugt fra rute-bulk):
```ts
for (const stopId of ids) {
  await routeMutationQueue.run(
    () => deleteStop(stopId),
    { claim: { key: newRouteMutationKey("remove_stop", stopId), kind: "remove_stop", businessId } }
  );
  setProgress({ done: ++done, total: ids.length });
}
```

## Levering
Jeg implementerer Del A først (multi-select + flyt + slet) og verificerer at build/types går igennem, derefter Del B (bulk-til-rute). To separate svar så ændringerne er overskuelige at reviewe.
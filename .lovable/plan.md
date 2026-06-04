# Færdiggørelse af RoutePlanner-refactor (Fase 2 + Fase 3)

Mål: flytte de sidste store domæneblokke ud af `RoutePlanner.tsx` (6.423 → ~4.500 linjer forventet) uden at ændre adfærd. Alt sker i frontend; ingen DB-ændringer, ingen UI-ændringer.

## Hooks der laves

```text
src/hooks/route-planner/
├── useRoutePlannerWorkflow.ts   (Fase 3 — pending-dialog state)
├── useRoutePlannerDnd.ts        (Fase 2 — drag-and-drop)
├── useRoutePlannerKeyboard.ts   (Fase 2 — globale hotkeys inkl. undo/redo)
└── useRouteSelection.ts         (Fase 2 — bulk-valg af ruter/jobs)
```

## 1) `useRoutePlannerWorkflow` — pending-dialog reducer (laves først)

Samler 11 state-variabler + 3 `useRouteSeriesInfo`-queries + sync-default-effect + 2 confirm-handlers:

- State: `pendingRouteMerge`, `mergingRoute`, `pendingRouteMove`, `pendingOptimizePrompt`, `pendingProjectedMove`, `projectedMoveSyncStart/Next`, `pendingStartDateChange`, `confirmingStartDate`, `pendingBulkStartDateChange`, `confirmingBulkStartDate`
- Queries: `pendingSeriesInfo`, `pendingProjectedSeriesInfo`, `pendingMergeSeriesInfo`
- Effect: auto-sync-default for projected move (linje 788–819)
- Handlers: `handleConfirmMoveRoute`, `handleConfirmRouteMerge`, `tryPromptOptimize`

Hooken får `businessId`, mutationer (`moveRouteSeries`, `shiftProjectedOccurrence`, `optimizeRoute`), `calendarStops`, `qc`/`supabase` som input. Returnerer al state + alle settere + de tre confirm-handlers. Dialog-JSX'en bliver i `RoutePlanner.tsx` og forbruger hookens returværdi.

Laves først, så DnD-hooken bagefter kan injiceres med setterne.

## 2) `useRoutePlannerDnd` — drag-and-drop

Samler alt @dnd-kit:

- Type/helpers (linje 144–183): `DragPoint`, `routeIdFromDndId`, `getDragPoint`, `getRouteDropPointTarget` flyttes til hookens fil (eller `src/lib/route-planner/dnd.ts` hvis renere)
- State + refs (375–406): `activeDragId`, `activeDragData`, `dragOverTargetId`, `routeDragPoint`, `busyTargets`, alle refs, `applyRouteOverlayPosition`, `setTargetBusy`
- Sensors + collision (885–946)
- Handlers: `handleDragStart`, `handleDragOver`, `handleDragMove`, `handleDragEnd`, `detectAssigneeConflicts`, `draggingTypeForCalendar`

`handleDragEnd` er ~660 linjer og kalder workflow-settere (`setPendingRouteMerge` osv.) — hooken modtager workflowens settere + mutationer som dependency-objekt. `<DndContext>`-wrapperen og `<DragOverlay>` bliver i `RoutePlanner.tsx` og bruger hookens returnerede props.

## 3) `useRoutePlannerKeyboard` — globale hotkeys

Hele keydown-`useEffect`en (2090–2160) flyttes ud. Hooken får et callbacks-objekt:
`{ history, onNavigate, onToggleView, onFocusSearch, onOpenCreate, onAutoAssign, onOptimize, onPrint, onOpenShortcuts, ... }`. Undo/redo (Ctrl+Z, Shift+Ctrl+Z, Ctrl+Y) falder naturligt ud her.

## 4) `useRouteSelection` — bulk-valg

Samler `selectedJobIds`, `selectedRouteIds`, `bulkBusy`, `bulkMoveInProgress`, `bulkMoveProgress` samt `toggleRouteSelection` og tilsvarende job-toggle. Lille, men fjerner spredte useStates.

## Tekniske detaljer

- Ingen logikændringer — kun flytning. Existing tests skal forblive grønne.
- Hver hook har samme React-render-rækkefølge som i dag (vigtigt pga. queries inde i workflow-hooken).
- Inter-hook dependencies løses via eksplicitte parametre, ikke context. Rækkefølge i komponenten:
  ```text
  const workflow  = useRoutePlannerWorkflow({ ... });
  const selection = useRouteSelection();
  const dnd       = useRoutePlannerDnd({ workflow, selection, mutations, ... });
  useRoutePlannerKeyboard({ history, ... });
  ```
- Eksisterende `useRouteDialogs`, `useRoutePlannerFilters`, `useProjectedCalendar` bevares uændret.
- Ingen ændringer til `supabase/`, ingen schema-migrationer.

## Forventet resultat

- `RoutePlanner.tsx`: 6.423 → ~4.500 linjer
- 4 nye, isolerede hooks der hver kan testes/læses uafhængigt
- `handleDragEnd` og `handleConfirmRouteMerge` lever stadig som store funktioner, men i moduler hvor de ikke længere konkurrerer med rendering om filens fokus
- Klart afsæt for senere Fase 3-iteration: at omdanne `useRoutePlannerWorkflow` fra mange `useState` til en egentlig `useReducer`-state-maskine (ikke en del af denne leverance — kun struktureringen, så reducer-skiftet bliver mekanisk)

## Eksplicit *ikke* med

- Ingen omskrivning af `handleDragEnd`/`handleConfirmRouteMerge` til mindre funktioner endnu
- Ingen indførelse af `useReducer` i denne omgang — kun extraction. Reducer-konvertering tages som separat opfølgning når API'et er stabilt
- Ingen UI-, design-, eller adfærdsændringer

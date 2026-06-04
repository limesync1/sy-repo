import { useRouteDialogs } from "@/hooks/route-planner/useRouteDialogs";
import { useRoutePlannerFilters } from "@/hooks/route-planner/useRoutePlannerFilters";
import { useRoutePlannerWorkflowState } from "@/hooks/route-planner/useRoutePlannerWorkflowState";
import { useRouteSelection } from "@/hooks/route-planner/useRouteSelection";
import { useRouteHistory } from "@/hooks/useRouteHistory";
import { usePlannerActionLog } from "@/hooks/route-planner/usePlannerActionLog";

/**
 * usePlannerStore — Bølge 1 / pkt. 1.1 + 1.2 i .lovable/plan.md
 * -----------------------------------------------------------------------------
 * Samler RoutePlannerens klient-side state-overflade ét sted, så
 * `RoutePlanner.tsx` har ét call site i stedet for fem. Hooken er en facade
 * over de eksisterende, allerede isolerede hooks — den ændrer ingen
 * eksisterende setter-signaturer, så call-sites kan migrere ved kun at
 * destrukturere fra `store.<group>`.
 *
 * Sammensætning:
 *   store.selection — useRouteSelection (ruter + jobs bulk-multi-select)
 *   store.filters   — useRoutePlannerFilters (urgency/postcode/service)
 *   store.dialogs   — useRouteDialogs (modal-open-flag)
 *   store.workflow  — useRoutePlannerWorkflowState (pending* dialog-state)
 *   store.history   — useRouteHistory (ekstern store; server-side undo/redo)
 *   store.log       — usePlannerActionLog (client-side observability)
 *
 * BEMÆRK: Undo/redo for faktiske DB-mutationer bor stadig i `routeHistory`
 * (eksponeret via `store.history`). Det er den eneste korrekte måde at
 * fortryde server-state på — action-loggen er rent observerbar.
 */
export function usePlannerStore(opts: {
  calendarRangeStart: Date | string | number;
  calendarRangeEnd: Date | string | number;
  view: string;
}) {
  const selection = useRouteSelection({
    calendarRangeStart: opts.calendarRangeStart,
    calendarRangeEnd: opts.calendarRangeEnd,
    view: opts.view,
  });
  const filters = useRoutePlannerFilters();
  const dialogs = useRouteDialogs();
  const workflow = useRoutePlannerWorkflowState();
  const history = useRouteHistory();
  const log = usePlannerActionLog();

  return { selection, filters, dialogs, workflow, history, log };
}

export type PlannerStore = ReturnType<typeof usePlannerStore>;
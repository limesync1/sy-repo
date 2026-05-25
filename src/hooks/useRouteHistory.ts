import { useSyncExternalStore, useCallback } from "react";
import { toast } from "sonner";
import { routeHistory } from "@/lib/route-history";

/**
 * React-binding til den globale rute-history-stak.
 * Returnerer reaktiv `canUndo`, `lastLabel` og en `undo()`-funktion der
 * selv viser toast-feedback.
 */
export function useRouteHistory() {
  const subscribe = useCallback((cb: () => void) => routeHistory.subscribe(cb), []);
  const getSnapshot = useCallback(() => routeHistory.size() * 10 + (routeHistory.isUndoing() ? 1 : 0), []);
  // useSyncExternalStore vil re-render ved hver emit; vi bruger en numerisk
  // "version" så snapshot-equality er trivielt billigt.
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const last = routeHistory.peek();
  const canUndo = last != null && !routeHistory.isUndoing();

  const undo = useCallback(async () => {
    const entry = routeHistory.peek();
    if (!entry) return;
    try {
      const ran = await routeHistory.undoLast();
      if (ran) toast.success(`Fortrudt: ${ran.label}`);
    } catch (e: any) {
      toast.error("Kunne ikke fortryde", {
        description: e?.message ?? "Handlingen er muligvis allerede ændret af en anden bruger.",
      });
    }
  }, []);

  return {
    canUndo,
    isUndoing: routeHistory.isUndoing(),
    lastLabel: last?.label ?? null,
    undo,
  };
}
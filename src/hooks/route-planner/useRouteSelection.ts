import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useRouteSelection
 * -----------------------------------------------------------------------------
 * Samler bulk-multi-select state for både ruter (kalender-piller) og aftaler
 * (i "Aftaler uden rute"-panelet) ét sted. Selve handleren der ⌘/Shift-klikker
 * en rute bor stadig i RoutePlanner — denne hook eksponerer kun state og
 * primitive ændrings-handlers.
 *
 * Ruter ryddes automatisk når kalender-vinduet ændres så brugeren ikke
 * bulk-flytter ruter de ikke længere kan se.
 */
export function useRouteSelection(opts: {
  calendarRangeStart: Date | string | number;
  calendarRangeEnd: Date | string | number;
  view: string;
}) {
  const { calendarRangeStart, calendarRangeEnd, view } = opts;

  // Ruter
  const [selectedRouteIds, setSelectedRouteIds] = useState<Set<string>>(new Set());
  const [bulkMoveInProgress, setBulkMoveInProgress] = useState(false);
  const [bulkMoveProgress, setBulkMoveProgress] = useState<{ done: number; total: number } | null>(null);

  const toggleRouteSelection = useCallback((id: string) => {
    setSelectedRouteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const clearRouteSelection = useCallback(() => setSelectedRouteIds(new Set()), []);

  useEffect(() => {
    setSelectedRouteIds(new Set());
  }, [calendarRangeStart, calendarRangeEnd, view]);

  // Aftaler (jobs) — bruges af "Aftaler uden rute"-panelet og af keyboard
  // shortcuts (Escape rydder valget). Vi eksponerer også en ref til sidst
  // valgte id, så Shift+klik kan udvælge et område uden at vi skal vedligeholde
  // separate states fra to forskellige steder.
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const lastSelectedJobIdRef = useRef<string | null>(null);

  return {
    selectedRouteIds,
    setSelectedRouteIds,
    toggleRouteSelection,
    clearRouteSelection,
    bulkMoveInProgress,
    setBulkMoveInProgress,
    bulkMoveProgress,
    setBulkMoveProgress,
    selectedJobIds,
    setSelectedJobIds,
    bulkBusy,
    setBulkBusy,
    lastSelectedJobIdRef,
  };
}
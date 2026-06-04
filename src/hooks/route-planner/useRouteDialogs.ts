import { useState } from "react";

/**
 * useRouteDialogs
 * -----------------------------------------------------------------------------
 * Samler simple boolean-flag for modaler/dialoger i RoutePlanner et sted, så
 * komponenten ikke skal vedligeholde en lang liste af useState-kald for hvert
 * dialog-flag. Dialoger med rigere state (fx pendingX-objekter) bor stadig i
 * RoutePlanner — denne hook dækker kun open/close-flag.
 */
export function useRouteDialogs() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [bulkShiftOpen, setBulkShiftOpen] = useState(false);
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);

  return {
    shortcutsOpen,
    setShortcutsOpen,
    printOpen,
    setPrintOpen,
    dayDetailOpen,
    setDayDetailOpen,
    bulkShiftOpen,
    setBulkShiftOpen,
    createOrderOpen,
    setCreateOrderOpen,
    createOpen,
    setCreateOpen,
    diagnosticsOpen,
    setDiagnosticsOpen,
    bulkMoveOpen,
    setBulkMoveOpen,
  };
}
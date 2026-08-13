import { addDays, addMonths, addWeeks, format, parseISO } from "date-fns";
import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { toast } from "sonner";

/**
 * useRoutePlannerKeyboard
 * -----------------------------------------------------------------------------
 * Samler RoutePlanners globale keyboard-shortcuts (undo/redo, navigation, T/N/A
 * /D/J/K/P/O/Esc/Slet/?). Trigger-effekten kører kun når en input ikke har
 * fokus. Ingen logik er ændret — alle handlere kaldes præcis som før, blot ud
 * fra et opts-objekt så hookens dependency-overflade er eksplicit.
 */
export function useRoutePlannerKeyboard(opts: {
  history: { undo: () => void | Promise<void>; redo: () => void | Promise<void> };
  view: string;
  setDate: Dispatch<SetStateAction<string>>;
  todayStr: () => string;
  selectedJobIds: Set<string>;
  setSelectedJobIds: (s: Set<string>) => void;
  lastSelectedJobIdRef: MutableRefObject<string | null>;
  selectedStopId: string | null;
  setSelectedStopId: (id: string | null) => void;
  deleteStop: { mutate: (id: string, opts?: any) => void };
  editingRoute: { id: string } | null;
  setCreateOpen: (b: boolean) => void;
  setShortcutsOpen: (b: boolean) => void;
  setPrintOpen: (b: boolean) => void;
  setDayDetailOpen: (b: boolean) => void;
  focusSearchRef: MutableRefObject<() => void>;
  runAutoAssignRef: MutableRefObject<() => void | Promise<void>>;
  optimizeRouteRef: MutableRefObject<(id: string) => void>;
  /** Valgte ruter i kalenderen (bulk-flyt-tilstand). Esc rydder dem. */
  selectedRouteIds?: Set<string>;
  clearRouteSelection?: () => void;
  /** Valgte stop i kalenderen (bulk-slet-tilstand). Esc rydder dem. */
  selectedStopIds?: Set<string>;
  clearStopSelection?: () => void;
}) {
  // Alle props læses gennem en "latest"-ref, så keydown-lytteren aldrig
  // arbejder på en forældet kopi af fx `selectedRouteIds` (stale closure).
  const latest = useRef(opts);
  latest.current = opts;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const {
        history,
        view,
        setDate,
        todayStr,
        selectedJobIds,
        setSelectedJobIds,
        lastSelectedJobIdRef,
        selectedStopId,
        setSelectedStopId,
        deleteStop,
        editingRoute,
        setCreateOpen,
        setShortcutsOpen,
        setPrintOpen,
        setDayDetailOpen,
        focusSearchRef,
        runAutoAssignRef,
        optimizeRouteRef,
        selectedRouteIds,
        clearRouteSelection,
        selectedStopIds,
        clearStopSelection,
      } = latest.current;
      // Ignore when typing in inputs
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      // Undo/redo (skal håndteres FØR den generelle modifier-guard nedenfor).
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) void history.redo();
        else void history.undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        // Windows-konvention for redo.
        e.preventDefault();
        void history.redo();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        focusSearchRef.current();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setDate((d) => format(view === "week" ? addWeeks(parseISO(d), -1) : addMonths(parseISO(d), -1), "yyyy-MM-dd"));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setDate((d) => format(view === "week" ? addWeeks(parseISO(d), 1) : addMonths(parseISO(d), 1), "yyyy-MM-dd"));
      } else if (e.key.toLowerCase() === "t") {
        setDate(todayStr());
      } else if (e.key.toLowerCase() === "n") {
        setCreateOpen(true);
      } else if (e.key.toLowerCase() === "a") {
        e.preventDefault();
        void runAutoAssignRef.current();
      } else if (e.key === "Escape") {
        if (selectedRouteIds && selectedRouteIds.size > 0) {
          clearRouteSelection?.();
        } else if (selectedStopIds && selectedStopIds.size > 0) {
          clearStopSelection?.();
        } else if (selectedJobIds.size > 0) {
          setSelectedJobIds(new Set());
          lastSelectedJobIdRef.current = null;
        } else if (selectedStopId) {
          setSelectedStopId(null);
        }
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedStopId) {
        if (selectedStopId.startsWith("virtual-stop:")) {
          toast.message("Projicerede stops kan ikke slettes — åbn originalruten for at ændre.");
          return;
        }
        e.preventDefault();
        const id = selectedStopId;
        deleteStop.mutate(id, {
          onSuccess: () => {
            toast.success("Stop fjernet fra rute");
            setSelectedStopId(null);
          },
          onError: (err: any) => toast.error("Kunne ikke fjerne stoppet", { description: err?.message }),
        });
      } else if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShortcutsOpen(true);
      } else if (e.key.toLowerCase() === "p") {
        e.preventDefault();
        setPrintOpen(true);
      } else if (e.key.toLowerCase() === "d") {
        e.preventDefault();
        setDayDetailOpen(true);
      } else if (e.key.toLowerCase() === "j") {
        e.preventDefault();
        setDate((d) => format(addDays(parseISO(d), 1), "yyyy-MM-dd"));
      } else if (e.key.toLowerCase() === "k") {
        e.preventDefault();
        setDate((d) => format(addDays(parseISO(d), -1), "yyyy-MM-dd"));
      } else if (e.key.toLowerCase() === "o") {
        if (editingRoute) {
          e.preventDefault();
          optimizeRouteRef.current(editingRoute.id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
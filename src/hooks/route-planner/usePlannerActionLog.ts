import { useCallback, useRef, useSyncExternalStore } from "react";

/**
 * usePlannerActionLog
 * -----------------------------------------------------------------------------
 * Tynd ringbuffer (default 50 plads) over client-side state-actions i Route
 * Planner (filterskift, valg, dialog-toggles). Bruges til:
 *  - Debug-overlay: "hvad gjorde brugeren lige før crash?"
 *  - Fremtidig simulation/audit-view
 *
 * BEMÆRK: Dette er IKKE undo/redo for DB-mutationer — det h\u00e5ndteres af
 * `routeHistory`/`useRouteHistory` der re-k\u00f8rer faktiske server-kald.
 * Action-loggen er rent observerbar og p\u00e5virker ikke state.
 */

export type PlannerActionEntry = {
  type: string;
  payload?: unknown;
  at: number;
};

const DEFAULT_CAPACITY = 50;

export function usePlannerActionLog(capacity: number = DEFAULT_CAPACITY) {
  const bufferRef = useRef<PlannerActionEntry[]>([]);
  const versionRef = useRef(0);
  const listenersRef = useRef(new Set<() => void>());

  const subscribe = useCallback((cb: () => void) => {
    listenersRef.current.add(cb);
    return () => listenersRef.current.delete(cb);
  }, []);
  const getSnapshot = useCallback(() => versionRef.current, []);
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const record = useCallback((type: string, payload?: unknown) => {
    const entry: PlannerActionEntry = { type, payload, at: Date.now() };
    const buf = bufferRef.current;
    buf.push(entry);
    if (buf.length > capacity) buf.splice(0, buf.length - capacity);
    versionRef.current += 1;
    listenersRef.current.forEach((l) => l());
  }, [capacity]);

  const clear = useCallback(() => {
    bufferRef.current = [];
    versionRef.current += 1;
    listenersRef.current.forEach((l) => l());
  }, []);

  return {
    record,
    clear,
    /** Seneste action (eller null). Stabil reference indtil ny action. */
    last: bufferRef.current[bufferRef.current.length - 1] ?? null,
    /** Snapshot af alle actions i bufferen. */
    all: bufferRef.current.slice(),
    size: bufferRef.current.length,
  };
}
/**
 * Route planner undo/redo stack (Fase B.3).
 *
 * En lille global singleton der lader call-sites registrere en handling
 * sammen med dens *inverse*. UI'et binder Cmd/Ctrl+Z og en knap til at
 * afspille den senest pushede `undo()`.
 *
 * Med vilje *uden* react-query eller supabase: stakken kender ikke selve
 * mutationerne — den holder kun en callback. Det gør den triviel at unit-
 * teste og holder mutationslogikken samlet ét sted (useRoutes.ts).
 *
 * Levetid: kun in-memory pr. tab. Reloads = tom stak (det er bevidst —
 * man fortryder ikke gårsdagens drag-and-drop på den måde).
 */

export type HistoryEntry = {
  id: string;
  /** Kort menneske-læsbar beskrivelse vist i toast og toolbar-tooltip. */
  label: string;
  /** Tidsstempel for sortering / "for 3 sek siden"-visning. */
  at: number;
  /** Inverse-handling. Skal selv vise sin egen success/error-toast. */
  undo: () => void | Promise<void>;
  /**
   * Re-do — gentager den oprindelige handling efter en undo.
   * Hvis udeladt, fjernes entry'en fra redo-stakken efter undo (engangs-fortryd).
   */
  redo?: () => void | Promise<void>;
  /**
   * Hvis undo'en selv afhænger af serverstate der måske allerede er fjernet
   * (slettet rute, anden bruger ændrede noget), kan vi markere den som
   * "ikke fortryd-bar" og UI'et viser graceful fejl.
   */
  preflight?: () => boolean | Promise<boolean>;
};

type Listener = () => void;

const MAX_ENTRIES = 50;

class RouteHistoryStore {
  private stack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private listeners = new Set<Listener>();
  private undoing = false;

  push(entry: Omit<HistoryEntry, "id" | "at">): void {
    const full: HistoryEntry = {
      ...entry,
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      at: Date.now(),
    };
    this.stack.push(full);
    if (this.stack.length > MAX_ENTRIES) this.stack.shift();
    // Ny handling invaliderer redo-stakken (klassisk undo-tree semantik).
    if (this.redoStack.length) this.redoStack = [];
    this.emit();
  }

  peek(): HistoryEntry | null {
    return this.stack[this.stack.length - 1] ?? null;
  }

  peekRedo(): HistoryEntry | null {
    return this.redoStack[this.redoStack.length - 1] ?? null;
  }

  /** Pop og kør den øverste undo-handling. Returnerer entry'en hvis den blev kørt. */
  async undoLast(): Promise<HistoryEntry | null> {
    if (this.undoing) return null;
    const entry = this.stack.pop();
    if (!entry) {
      this.emit();
      return null;
    }
    this.undoing = true;
    this.emit();
    try {
      if (entry.preflight) {
        const ok = await entry.preflight();
        if (!ok) return entry; // entry'en er allerede poppet; UI'et viser fejl
      }
      await entry.undo();
      if (entry.redo) {
        this.redoStack.push(entry);
        if (this.redoStack.length > MAX_ENTRIES) this.redoStack.shift();
      }
      return entry;
    } finally {
      this.undoing = false;
      this.emit();
    }
  }

  /** Pop og kør øverste redo-handling. */
  async redoLast(): Promise<HistoryEntry | null> {
    if (this.undoing) return null;
    const entry = this.redoStack.pop();
    if (!entry || !entry.redo) {
      this.emit();
      return null;
    }
    this.undoing = true;
    this.emit();
    try {
      await entry.redo();
      this.stack.push(entry);
      if (this.stack.length > MAX_ENTRIES) this.stack.shift();
      return entry;
    } finally {
      this.undoing = false;
      this.emit();
    }
  }

  clear(): void {
    this.stack = [];
    this.redoStack = [];
    this.emit();
  }

  size(): number { return this.stack.length; }
  redoSize(): number { return this.redoStack.length; }
  isUndoing(): boolean { return this.undoing; }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private emit(): void {
    for (const l of this.listeners) {
      try { l(); } catch (e) { console.warn("[route-history] listener fejl", e); }
    }
  }
}

export const routeHistory = new RouteHistoryStore();

/** Convenience — bruges direkte fra call-sites i RoutePlanner. */
export function pushRouteUndo(entry: Omit<HistoryEntry, "id" | "at">): void {
  routeHistory.push(entry);
}
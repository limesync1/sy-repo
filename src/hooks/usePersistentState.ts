// usePersistentState — useState der husker værdien i localStorage.
//
// Bruges i ruteplanlæggeren (og lignende værktøjer) til subtilt at huske
// brugerens layout- og filterjusteringer mellem besøg uden at gemme dem på
// serveren. Robust over for:
//   • SSR / manglende window — falder tilbage til initialværdien.
//   • Korrupt JSON i localStorage — falder tilbage til initialværdien.
//   • Quota-fejl ved skrivning — fejler stille uden at vælte UI.
//   • Flere hook-instanser med SAMME nøgle — holdes nu synkroniseret live
//     i samme fane via en custom-event (fx mørk-tilstand-toggle i en
//     dropdown der skal opdatere planlæggerens rod-element med det samme).
import { useCallback, useEffect, useRef, useState } from "react";

// Intern hændelse til at synkronisere instanser i SAMME fane. Den native
// `storage`-event fyrer kun i ANDRE faner, så vi broadcaster selv her.
const SYNC_EVENT = "usePersistentState:sync";

type SyncDetail = { key: string; value: unknown };

function readValue<T>(key: string, fallback: T | (() => T)): T {
  const resolveFallback = () =>
    typeof fallback === "function" ? (fallback as () => T)() : fallback;
  if (typeof window === "undefined") return resolveFallback();
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return resolveFallback();
    return JSON.parse(raw) as T;
  } catch {
    return resolveFallback();
  }
}

export function usePersistentState<T>(
  key: string,
  initial: T | (() => T),
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const initialRef = useRef(initial);
  const [state, setState] = useState<T>(() => readValue(key, initialRef.current));

  // Hold en ref på den seneste værdi så setteren kan beregne funktionelle
  // opdateringer uden at lave side-effekter inde i en setState-updater.
  const stateRef = useRef(state);
  stateRef.current = state;

  const setPersisted = useCallback<React.Dispatch<React.SetStateAction<T>>>(
    (value) => {
      const next =
        typeof value === "function"
          ? (value as (prev: T) => T)(stateRef.current)
          : value;
      stateRef.current = next;
      setState(next);
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
        window.dispatchEvent(
          new CustomEvent<SyncDetail>(SYNC_EVENT, { detail: { key, value: next } }),
        );
      } catch {
        /* ignore quota / serialization errors */
      }
    },
    [key],
  );

  // Lyt efter ændringer fra andre instanser (samme fane via custom-event,
  // andre faner via den native storage-event) og spejl dem ind i state.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onSync = (e: Event) => {
      const detail = (e as CustomEvent<SyncDetail>).detail;
      if (!detail || detail.key !== key) return;
      stateRef.current = detail.value as T;
      setState(detail.value as T);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      const next = readValue(key, initialRef.current);
      stateRef.current = next;
      setState(next);
    };
    window.addEventListener(SYNC_EVENT, onSync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SYNC_EVENT, onSync);
      window.removeEventListener("storage", onStorage);
    };
  }, [key]);

  return [state, setPersisted];
}

export default usePersistentState;
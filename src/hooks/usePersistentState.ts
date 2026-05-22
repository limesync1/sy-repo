// usePersistentState — useState der husker værdien i localStorage.
//
// Bruges i ruteplanlæggeren (og lignende værktøjer) til subtilt at huske
// brugerens layout- og filterjusteringer mellem besøg uden at gemme dem på
// serveren. Robust over for:
//   • SSR / manglende window — falder tilbage til initialværdien.
//   • Korrupt JSON i localStorage — falder tilbage til initialværdien.
//   • Quota-fejl ved skrivning — fejler stille uden at vælte UI.
import { useEffect, useRef, useState } from "react";

export function usePersistentState<T>(
  key: string,
  initial: T | (() => T),
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const initialRef = useRef(initial);
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") {
      return typeof initialRef.current === "function"
        ? (initialRef.current as () => T)()
        : initialRef.current;
    }
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) {
        return typeof initialRef.current === "function"
          ? (initialRef.current as () => T)()
          : initialRef.current;
      }
      return JSON.parse(raw) as T;
    } catch {
      return typeof initialRef.current === "function"
        ? (initialRef.current as () => T)()
        : initialRef.current;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* ignore quota / serialization errors */
    }
  }, [key, state]);

  return [state, setState];
}

export default usePersistentState;
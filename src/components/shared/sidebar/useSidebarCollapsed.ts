import { useCallback, useEffect, useRef, useState } from "react";

export const SIDEBAR_STORAGE_KEYS = {
  business: "sy.sidebar.collapsed.business",
  employee: "sy.sidebar.collapsed.employee",
  platform: "sy.sidebar.collapsed.platform",
} as const;

export const readSidebarCollapsed = (storageKey: string, defaultValue = false) => {
  if (typeof window === "undefined") return defaultValue;
  try {
    const value = window.localStorage.getItem(storageKey);
    if (value === "1") return true;
    if (value === "0") return false;
  } catch { /* noop */ }
  return defaultValue;
};

const parseStored = (value: string | null, defaultValue: boolean) =>
  value === "1" ? true : value === "0" ? false : defaultValue;

/**
 * Persisteret collapse-state for sidebar. Hver shell sender sin egen storageKey
 * (fx "sy.sidebar.collapsed.platform") så admin/virksomhed/medarbejder hver
 * husker deres egen præference uafhængigt.
 *
 * - Genvejstast: tryk på `[` for at toggle (ignoreres i input/textarea/select
 *   og contenteditable, og når en modifier-tast holdes nede).
 * - Holdes i sync mellem browserfaner via `storage`-eventet.
 * - Tastatur-listeneren registreres ÉN gang (state læses via ref), så den ikke
 *   afmonteres/genmonteres ved hvert toggle.
 */
export const useSidebarCollapsed = (storageKey: string, defaultValue = false) => {
  const [collapsed, setCollapsedState] = useState<boolean>(() =>
    readSidebarCollapsed(storageKey, defaultValue),
  );
  const ref = useRef(collapsed);
  ref.current = collapsed;

  const setCollapsed = useCallback((next: boolean) => {
    ref.current = next;
    setCollapsedState(next);
    if (typeof window !== "undefined") {
      try { window.localStorage.setItem(storageKey, next ? "1" : "0"); } catch { /* noop */ }
    }
  }, [storageKey]);

  const toggle = useCallback(() => setCollapsed(!ref.current), [setCollapsed]);

  // Skifter storageKey (sjældent) skal vi læse den nye værdi.
  useEffect(() => {
    const next = readSidebarCollapsed(storageKey, defaultValue);
    ref.current = next;
    setCollapsedState(next);
  }, [storageKey, defaultValue]);

  // Genvejstast `[`.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t?.isContentEditable) return;
      e.preventDefault();
      setCollapsed(!ref.current);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCollapsed]);

  // Sync mellem browserfaner.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== storageKey) return;
      const next = parseStored(e.newValue, defaultValue);
      ref.current = next;
      setCollapsedState(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [storageKey, defaultValue]);

  return { collapsed, setCollapsed, toggle };
};

export default useSidebarCollapsed;

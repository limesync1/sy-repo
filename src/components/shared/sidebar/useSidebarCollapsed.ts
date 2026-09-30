import { useCallback, useEffect, useState } from "react";

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

/**
 * Persisteret collapse-state for sidebar. Hver shell sender sin egen storageKey
 * (fx "sy.sidebar.collapsed.platform") så admin/virksomhed/medarbejder hver
 * husker deres egen præference uafhængigt.
 *
 * Indbygget genvejstast: tryk på `[` for at toggle (ignoreres når brugeren
 * skriver i input/textarea).
 */
export const useSidebarCollapsed = (storageKey: string, defaultValue = false) => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return readSidebarCollapsed(storageKey, defaultValue);
  });

  const persist = useCallback((next: boolean) => {
    setCollapsed(next);
    if (typeof window !== "undefined") {
      try { window.localStorage.setItem(storageKey, next ? "1" : "0"); } catch { /* noop */ }
    }
  }, [storageKey]);

  const toggle = useCallback(() => persist(!collapsed), [collapsed, persist]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (t && (t as any).isContentEditable)) return;
      e.preventDefault();
      persist(!collapsed);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [collapsed, persist]);

  return { collapsed, setCollapsed: persist, toggle };
};

export default useSidebarCollapsed;
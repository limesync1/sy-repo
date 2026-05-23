// useRecentTabs — husker de seneste besøgte admin-faner i localStorage.
// Bruges til at vise "Senest besøgt" øverst i kommando-paletten så de
// hyppigste hop er ét tryk væk.
import { useEffect, useState, useCallback } from "react";

const KEY = "sy.admin.recent-tabs";
const MAX = 5;

export function useRecentTabs(currentTab: string) {
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!currentTab) return;
    setRecent((prev) => {
      const next = [currentTab, ...prev.filter((t) => t !== currentTab)].slice(0, MAX);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [currentTab]);

  const clear = useCallback(() => {
    setRecent([]);
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  }, []);

  return { recent, clear };
}
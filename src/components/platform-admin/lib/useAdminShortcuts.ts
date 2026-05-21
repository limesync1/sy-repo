import { useEffect, useRef } from "react";

/**
 * Vim-style tastatur-shortcuts til admin-panelet.
 * Tryk "g" og derefter et bogstav inden for 1,2s for at hoppe til en fane:
 *   g o → overview        g v → businesses
 *   g u → users           g r → orders (kvitteringer)
 *   g s → subscriptions   g a → audit log
 *   g h → health          g m → mails
 *   g c → livechat
 * Shortcuts ignoreres mens man skriver i input/textarea/contenteditable.
 */
const MAP: Record<string, string> = {
  o: "overview",
  v: "businesses",
  u: "users",
  r: "orders",
  s: "subscriptions",
  a: "audit",
  h: "health",
  m: "mails",
  c: "livechat",
  d: "domains",
};

export function useAdminShortcuts(onJump: (tab: string) => void) {
  const armedRef = useRef<number | null>(null);
  useEffect(() => {
    const isTyping = (el: EventTarget | null) => {
      const t = el as HTMLElement | null;
      if (!t) return false;
      const tag = t.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) return;
      if (e.key === "g") {
        if (armedRef.current) window.clearTimeout(armedRef.current);
        armedRef.current = window.setTimeout(() => { armedRef.current = null; }, 1200);
        return;
      }
      if (armedRef.current && MAP[e.key]) {
        e.preventDefault();
        window.clearTimeout(armedRef.current);
        armedRef.current = null;
        onJump(MAP[e.key]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (armedRef.current) window.clearTimeout(armedRef.current);
    };
  }, [onJump]);
}
import { useEffect, useRef, useState } from "react";

export type DriveIssue = {
  id: "no-geo" | "denied" | "unavailable" | "timeout" | "stale" | "weak" | "offline" | "insecure";
  tone: "error" | "warning";
  title: string;
  body: string;
  action?: "retry" | "help";
};

/** Keeps the screen awake while driving; re-acquires after tab switches. */
export function useWakeLock(active: boolean) {
  const [unsupported, setUnsupported] = useState(false);
  useEffect(() => {
    if (!active) return;
    const wl = (navigator as any).wakeLock;
    if (!wl?.request) { setUnsupported(true); return; }
    let sentinel: any = null;
    let cancelled = false;
    const acquire = async () => {
      if (document.visibilityState !== "visible" || sentinel) return;
      try {
        sentinel = await wl.request("screen");
        sentinel.addEventListener?.("release", () => { sentinel = null; });
        if (cancelled) sentinel.release?.();
      } catch { /* low battery or denied — screen just follows system timeout */ }
    };
    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", acquire);
      sentinel?.release?.();
    };
  }, [active]);
  return { unsupported };
}

export function useOnline() {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return online;
}

/** Combines every location/network problem into one prioritized, Danish list. */
export function useDriveIssues(opts: {
  active: boolean;
  permission: "granted" | "denied" | "prompt" | "unknown";
  gpsErrorCode: number | null;
  lastFixAt: number | null;
  accuracyM: number | null;
}): DriveIssue[] {
  const online = useOnline();
  const [now, setNow] = useState(Date.now());
  const tick = useRef<number>();
  useEffect(() => {
    if (!opts.active) return;
    tick.current = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(tick.current);
  }, [opts.active]);
  if (!opts.active) return [];
  const issues: DriveIssue[] = [];
  if (typeof window !== "undefined" && !window.isSecureContext) {
    issues.push({ id: "insecure", tone: "error", title: "Placering kræver sikker forbindelse", body: "Åbn siden via https://, så telefonen må dele din position." });
  } else if (!("geolocation" in navigator)) {
    issues.push({ id: "no-geo", tone: "error", title: "Din browser kan ikke dele placering", body: "Brug Chrome eller Safari, eller skift til tjekliste-visning." });
  } else if (opts.permission === "denied" || opts.gpsErrorCode === 1) {
    issues.push({ id: "denied", tone: "error", title: "Adgang til placering er slået fra", body: "Tryk på hængelåsen i adresselinjen → Placering → Tillad. På iPhone: Indstillinger → Safari → Placering. Prøv derefter igen.", action: "help" });
  } else if (opts.gpsErrorCode === 2) {
    issues.push({ id: "unavailable", tone: "warning", title: "Din position kan ikke findes", body: "Tjek at Placering/GPS er slået til på telefonen, og kør et sted med frit udsyn.", action: "retry" });
  } else if (opts.gpsErrorCode === 3) {
    issues.push({ id: "timeout", tone: "warning", title: "GPS svarer langsomt", body: "Vi prøver igen automatisk. Stoppene kan stadig bruges.", action: "retry" });
  } else if (opts.lastFixAt && now - opts.lastFixAt > 45_000) {
    issues.push({ id: "stale", tone: "warning", title: "Ingen ny position i over 45 sek.", body: "Din position på kortet kan være forældet.", action: "retry" });
  } else if (opts.accuracyM != null && opts.accuracyM > 100) {
    issues.push({ id: "weak", tone: "warning", title: "Svagt GPS-signal", body: `Positionen er kun præcis inden for ca. ${Math.round(opts.accuracyM)} m. Ankomst registreres først, når signalet er bedre.` });
  }
  if (!online) {
    issues.push({ id: "offline", tone: "warning", title: "Ingen internetforbindelse", body: "Kortet og vejvisningen opdateres ikke. Markeringer som udført kan fejle, til du er online igen." });
  }
  return issues;
}

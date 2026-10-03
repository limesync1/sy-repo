import { useEffect, useRef, useState } from "react";

export type DriveIssue = {
  id: "no-geo" | "denied" | "unavailable" | "timeout" | "stale" | "weak" | "offline" | "insecure" | "night-map";
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

export const WEAK_GPS_M = 250;
export const WEAK_GPS_GRACE_MS = 20_000;

/** Night map: before 07:00, after 19:00, or when the device prefers dark. */
export function useNightMode() {
  const compute = () => {
    const h = new Date().getHours();
    const prefersDark = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    return h < 7 || h >= 19 || !!prefersDark;
  };
  const [auto, setAuto] = useState(compute);
  // Et manuelt valg gælder kun indtil næste automatiske skift (solopgang/
  // aften) — så man ikke står med lyst kort kl. 22 pga. et valg fra i går.
  const [override, setOverride] = useState<{ value: boolean; against: boolean } | null>(() => {
    try { const v = JSON.parse(localStorage.getItem("route-night-mode-v2") || "null"); return v && typeof v.value === "boolean" ? v : null; } catch { return null; }
  });
  useEffect(() => {
    const id = window.setInterval(() => setAuto(compute()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    if (override && override.against !== auto) {
      setOverride(null);
      try { localStorage.removeItem("route-night-mode-v2"); } catch { /* private mode */ }
    }
  }, [auto, override]);
  const night = override && override.against === auto ? override.value : auto;
  const toggle = () => {
    const next = { value: !night, against: auto };
    setOverride(next);
    try { localStorage.setItem("route-night-mode-v2", JSON.stringify(next)); } catch { /* private mode */ }
  };
  return { night, toggle };
}

/** Applies dark theme to the document root while active, so portal windows (stop sheet, dialogs) follow night mode. */
export function useRootDark(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const had = root.classList.contains("dark");
    root.classList.add("dark");
    return () => { if (!had) root.classList.remove("dark"); };
  }, [active]);
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
  // Phones often report 100–200 m while warming up; only a sustained, very
  // poor fix is worth interrupting the driver for.
  const weakSinceRef = useRef<number | null>(null);
  const veryWeak = opts.accuracyM != null && opts.accuracyM > WEAK_GPS_M;
  if (!veryWeak) weakSinceRef.current = null;
  else if (weakSinceRef.current == null) weakSinceRef.current = Date.now();
  useEffect(() => {
    if (!opts.active) return;
    tick.current = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(tick.current);
  }, [opts.active]);
  if (!opts.active) return [];
  const issues: DriveIssue[] = [];
  const weakLongEnough = weakSinceRef.current != null && now - weakSinceRef.current >= WEAK_GPS_GRACE_MS;
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
  } else if (veryWeak && weakLongEnough) {
    issues.push({ id: "weak", tone: "warning", title: "Unøjagtig position", body: "Kortet kan være lidt forskudt. Du kan stadig starte og udføre aftaler som normalt." });
  }
  if (!online) {
    issues.push({ id: "offline", tone: "warning", title: "Ingen internetforbindelse", body: "Kortet og vejvisningen opdateres ikke. Markeringer som udført kan fejle, til du er online igen." });
  }
  return issues;
}

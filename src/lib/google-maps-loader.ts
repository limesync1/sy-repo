/**
 * Loads the Google Maps JavaScript API exactly once per page. Every caller
 * shares the same promise, so closing/reopening the view or remounting the
 * map never injects a second script. Failures (timeout, auth/referrer
 * rejection, network) reject the promise and are remembered for the session
 * so the route view falls back to the open map without retry loops.
 */
declare global {
  interface Window {
    __serviceydereGmapsReady?: () => void;
    gm_authFailure?: () => void;
    google?: typeof google;
  }
}

const FAILURE_KEY = "serviceydere:gmaps-failed";
const CALLBACK = "__serviceydereGmapsReady";
let loadPromise: Promise<typeof google> | null = null;
const authListeners = new Set<() => void>();

export class GoogleMapsLoadError extends Error {
  constructor(public reason: "missing-key" | "timeout" | "auth" | "network", message: string) {
    super(message);
    this.name = "GoogleMapsLoadError";
  }
}

export function googleMapsBrowserKey(): string | undefined {
  const key = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] as string | undefined;
  return key?.trim() || undefined;
}

export function googleMapsPreviouslyFailed(): boolean {
  try { return sessionStorage.getItem(FAILURE_KEY) === "1"; } catch { return false; }
}
export function rememberGoogleMapsFailure(failed: boolean) {
  try { failed ? sessionStorage.setItem(FAILURE_KEY, "1") : sessionStorage.removeItem(FAILURE_KEY); } catch { /* private mode */ }
}

/** Google calls this global when the key or referrer is rejected — possibly after the map rendered. */
export function onGoogleMapsAuthFailure(listener: () => void): () => void {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

export function loadGoogleMaps(timeoutMs = 8000): Promise<typeof google> {
  if (window.google?.maps?.Map) return Promise.resolve(window.google);
  if (loadPromise) return loadPromise;
  const key = googleMapsBrowserKey();
  if (!key) return Promise.reject(new GoogleMapsLoadError("missing-key", "Google Maps-nøglen mangler"));

  loadPromise = new Promise<typeof google>((resolve, reject) => {
    let settled = false;
    const fail = (err: GoogleMapsLoadError) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      loadPromise = null; // allow an explicit retry later
      document.getElementById("gmaps-js")?.remove();
      reject(err);
    };
    const timer = window.setTimeout(() => fail(new GoogleMapsLoadError("timeout", "Google Maps svarede ikke i tide")), timeoutMs);
    window.gm_authFailure = () => {
      authListeners.forEach((l) => l());
      fail(new GoogleMapsLoadError("auth", "Google Maps afviste nøglen på dette domæne"));
    };
    window[CALLBACK] = () => {
      if (settled) return;
      if (!window.google?.maps?.Map) return fail(new GoogleMapsLoadError("network", "Google Maps blev ikke indlæst korrekt"));
      settled = true;
      window.clearTimeout(timer);
      resolve(window.google);
    };
    const params = new URLSearchParams({ key, loading: "async", callback: CALLBACK, language: "da", region: "DK", v: "weekly" });
    const channel = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] as string | undefined;
    if (channel) params.set("channel", channel);
    const script = document.createElement("script");
    script.id = "gmaps-js";
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.onerror = () => fail(new GoogleMapsLoadError("network", "Google Maps kunne ikke hentes — tjek forbindelsen"));
    document.head.appendChild(script);
  });
  return loadPromise;
}

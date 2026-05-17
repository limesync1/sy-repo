// Stale-deploy detection uden service worker.
//
// Idé: ved boot snapshotter vi hash'en på det første hashed asset i den
// nuværende index.html (fx "/assets/index-DYM2bYk8.js"). Periodisk + når
// brugeren kommer tilbage til fanen genhenter vi "/" (cache: no-store) og
// sammenligner. Hvis hash'en har ændret sig, ved vi en ny deploy er live,
// og vi kan reloade ved næste route-skift (mindst forstyrrende tidspunkt)
// — eller med det samme hvis en chunk-load fejler.
//
// Vi importerer ingen byggetidsmanifest; det her virker på enhver Vite-build
// fordi Vite altid emitter hashed entry-chunks.

const STORAGE_KEY = "__lovable_stale_deploy__";
let initialHash: string | null = null;
let staleDetected = false;
const listeners = new Set<() => void>();

const extractAssetHash = (html: string): string | null => {
  // Match første <script type="module" src="/assets/XXXX.js"> el. preload
  const m =
    html.match(/<script[^>]+src="(\/assets\/[^"]+\.js)"/) ||
    html.match(/<link[^>]+href="(\/assets\/[^"]+\.js)"/);
  return m ? m[1] : null;
};

const readCurrentBootHash = (): string | null => {
  if (typeof document === "undefined") return null;
  const script = document.querySelector<HTMLScriptElement>(
    'script[type="module"][src^="/assets/"]',
  );
  return script?.getAttribute("src") || null;
};

const markStale = () => {
  if (staleDetected) return;
  staleDetected = true;
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {}
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
};

export const isStaleDeploy = () => staleDetected;

export const onStaleDeploy = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const checkOnce = async () => {
  if (staleDetected || !initialHash) return;
  try {
    const res = await fetch(window.location.origin + "/", {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!res.ok) return;
    const html = await res.text();
    const latest = extractAssetHash(html);
    if (latest && latest !== initialHash) markStale();
  } catch {
    // Netværksfejl — prøv igen næste tick.
  }
};

export const startVersionCheck = (intervalMs = 5 * 60_000) => {
  if (typeof window === "undefined") return () => {};
  initialHash = readCurrentBootHash();
  if (!initialHash) return () => {};

  const onVisible = () => {
    if (document.visibilityState === "visible") checkOnce();
  };
  const interval = window.setInterval(checkOnce, intervalMs);
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", checkOnce);
  // Første check kort efter boot — fanger hot redeploys.
  window.setTimeout(checkOnce, 30_000);

  return () => {
    window.clearInterval(interval);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", checkOnce);
  };
};

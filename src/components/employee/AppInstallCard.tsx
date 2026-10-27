import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Check, Download, PlusSquare, Share, X } from "lucide-react";
import apkAsset from "@/assets/downloads/serviceydere-medarbejder.apk.asset.json";
import { cn } from "@/lib/utils";
import { detectInstallPlatform, installOptionOrder, isAppInstalled, type InstallPlatform } from "@/lib/app-install";

const DISMISS_KEY = "sy-app-install-dismissed";
const APK_MB = Math.round((apkAsset.size / 1024 / 1024) * 10) / 10;

type DeferredPrompt = Event & { prompt: () => Promise<void>; userChoice?: Promise<{ outcome: string }> };
const readPrompt = () => (window as unknown as { __syInstallPrompt?: DeferredPrompt }).__syInstallPrompt ?? null;

const readDismissed = () => {
  try { return window.localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
};

export const AndroidLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
    <path d="M18.44 5.56c-.68 1.17-1.35 2.33-2.03 3.5l-.11-.04c-1.82-.7-3.48-.8-4.42-.79-1.85.02-3.35.46-4.26.82L5.6 5.57a1.15 1.15 0 0 0-.14-.19c-.33-.36-.9-.49-1.38-.2-.24.11-.42.32-.5.57-.14.38-.04.74.17 1.04l2.22 3.84C3.98 11.83 2.49 13.71 1.84 15.92c-.11.4-.2.8-.26 1.2h21.1a9.8 9.8 0 0 0-1.52-3.91 9.86 9.86 0 0 0-2.53-2.54c-.26-.18-.53-.33-.8-.49l2.24-3.85c.21-.36.25-.82.06-1.2-.21-.43-.72-.68-1.2-.62-.4.04-.76.3-.95.65zM7.4 11.82c.49 0 .91.44.9.93 0 .49-.43.9-.92.9a.92.92 0 0 1-.9-.91c0-.5.42-.92.92-.92zm9.2 0c.49 0 .91.44.9.93 0 .49-.43.9-.92.9a.92.92 0 0 1-.9-.91c0-.5.42-.92.92-.92z" />
  </svg>
);

export const AppleLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
    <path d="M12.15 6.9c-.95 0-2.42-1.08-3.96-1.04-2.04.03-3.91 1.18-4.96 3.01-2.12 3.68-.55 9.1 1.52 12.09 1.01 1.45 2.2 3.09 3.79 3.04 1.52-.07 2.09-.99 3.93-.99 1.83 0 2.35.99 3.96.95 1.64-.03 2.68-1.48 3.68-2.95 1.15-1.69 1.63-3.33 1.66-3.42-.04-.01-3.18-1.22-3.22-4.86-.03-3.04 2.48-4.49 2.6-4.56-1.43-2.09-3.63-2.32-4.4-2.38-2-.15-3.67 1.09-4.6 1.09zM15.53 3.83c.84-1.01 1.4-2.43 1.25-3.83-1.21.05-2.67.8-3.54 1.82-.78.9-1.45 2.34-1.27 3.71 1.34.1 2.72-.69 3.56-1.7" />
  </svg>
);

/**
 * Smart installationskort på Min dag: viser kun det relevante for enheden,
 * forsvinder når appen allerede kører installeret, og kan skjules.
 */
export function AppInstallCard({ className }: { className?: string }) {
  const env = useMemo(() => {
    if (typeof window === "undefined") return null;
    const nav = navigator as Navigator & { standalone?: boolean };
    return {
      userAgent: nav.userAgent,
      maxTouchPoints: nav.maxTouchPoints,
      standalone: window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone === true,
      native: Capacitor.isNativePlatform(),
    };
  }, []);
  const platform: InstallPlatform = env ? detectInstallPlatform(env) : "desktop";
  const [dismissed, setDismissed] = useState(readDismissed);
  const [open, setOpen] = useState<"android" | "ios" | null>(null);
  const [prompt, setPrompt] = useState<DeferredPrompt | null>(() => (typeof window === "undefined" ? null : readPrompt()));

  useEffect(() => {
    const sync = () => setPrompt(readPrompt());
    window.addEventListener("sy-install-available", sync);
    return () => window.removeEventListener("sy-install-available", sync);
  }, []);

  if (!env || isAppInstalled(env) || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try { window.localStorage.setItem(DISMISS_KEY, "1"); } catch { /* blokeret lager: skjul kun nu */ }
  };

  const addToHomeScreen = async () => {
    if (!prompt) { setOpen("android"); return; }
    await prompt.prompt();
    (window as unknown as { __syInstallPrompt?: Event }).__syInstallPrompt = undefined;
    setPrompt(null);
  };

  const order = installOptionOrder(platform);
  const isIosNonSafari = platform === "ios" && /crios|fxios|edgios/i.test(env.userAgent);

  const tiles = {
    android: (
      <a
        key="android"
        href={apkAsset.url}
        download="Serviceydere-Medarbejder.apk"
        onClick={() => setOpen("android")}
        className={cn(
          "group flex min-h-14 min-w-0 items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          platform === "android" ? "brand-blue-action border-transparent" : "border-border bg-card hover:bg-secondary/60",
        )}
      >
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-md", platform === "android" ? "bg-background/20" : "bg-secondary")}>
          <AndroidLogo className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-tight">Android</span>
          <span className={cn("block text-xs leading-tight", platform === "android" ? "opacity-85" : "text-muted-foreground")}>Hent app · {APK_MB} MB</span>
        </span>
        <Download className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
      </a>
    ),
    ios: (
      <button
        key="ios"
        type="button"
        onClick={() => setOpen(open === "ios" ? null : "ios")}
        aria-expanded={open === "ios"}
        className={cn(
          "group flex min-h-14 min-w-0 items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          platform === "ios" ? "brand-blue-action border-transparent" : "border-border bg-card hover:bg-secondary/60",
        )}
      >
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-md", platform === "ios" ? "bg-background/20" : "bg-secondary")}>
          <AppleLogo className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-tight">iPhone</span>
          <span className={cn("block text-xs leading-tight", platform === "ios" ? "opacity-85" : "text-muted-foreground")}>Tilføj til hjemmeskærm</span>
        </span>
        <PlusSquare className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
      </button>
    ),
  };

  return (
    <section aria-labelledby="app-install-title" className={cn("rounded-md border border-border bg-card p-3 sm:p-4", className)}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 id="app-install-title" className="text-sm font-semibold leading-snug text-foreground sm:text-base">Hent Serviceydere-appen</h3>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground sm:text-sm">
            {platform === "desktop" ? "Åbn Min dag på din telefon for at installere appen." : "Åbn din dag med ét tryk fra telefonens hjemmeskærm."}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Skjul forslag om app"
          className="-mr-2 -mt-2 grid h-11 w-11 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
        {order.map((key) => tiles[key])}
      </div>

      {open === "android" && (
        <div className="mt-3 rounded-md bg-secondary/60 p-3 text-xs leading-relaxed text-foreground sm:text-sm" role="status">
          <p className="font-semibold">Sådan installerer du på Android</p>
          <ol className="mt-1 space-y-1">
            <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />Åbn den hentede fil fra notifikationen eller mappen Downloads.</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />Tillad installation fra browseren, hvis telefonen spørger.</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />Tryk Installer. Appen åbner direkte i Min dag.</li>
          </ol>
          {prompt && (
            <button type="button" onClick={addToHomeScreen} className="mt-2 min-h-11 font-semibold text-accent underline underline-offset-4">
              Eller tilføj blot til hjemmeskærmen
            </button>
          )}
        </div>
      )}

      {open === "ios" && (
        <div className="mt-3 rounded-md bg-secondary/60 p-3 text-xs leading-relaxed text-foreground sm:text-sm" role="status">
          <p className="font-semibold">Sådan tilføjer du på iPhone</p>
          {isIosNonSafari && <p className="mt-1 text-muted-foreground">Åbn først denne side i Safari.</p>}
          <ol className="mt-1 space-y-1.5">
            <li className="flex items-center gap-2"><span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-card"><Share className="h-3.5 w-3.5" aria-hidden /></span>Tryk på Del nederst i Safari.</li>
            <li className="flex items-center gap-2"><span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-card"><PlusSquare className="h-3.5 w-3.5" aria-hidden /></span>Vælg «Føj til hjemmeskærm».</li>
            <li className="flex items-center gap-2"><span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-card"><Check className="h-3.5 w-3.5 text-success" aria-hidden /></span>Tryk Tilføj. Appen ligger nu på hjemmeskærmen.</li>
          </ol>
        </div>
      )}
    </section>
  );
}

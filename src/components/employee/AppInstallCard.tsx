import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Check, PlusSquare, Share, X } from "lucide-react";
import apkAsset from "@/assets/downloads/serviceydere-medarbejder.apk.asset.json";
import { cn } from "@/lib/utils";
import BlueFlowBackground from "@/components/landing/BlueFlowBackground";
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
  const [tab, setTab] = useState<"android" | "ios">(platform === "ios" ? "ios" : "android");
  const [dismissed, setDismissed] = useState(readDismissed);
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
    if (!prompt) return;
    await prompt.prompt();
    (window as unknown as { __syInstallPrompt?: Event }).__syInstallPrompt = undefined;
    setPrompt(null);
  };

  const order = installOptionOrder(platform);
  const isIosNonSafari = platform === "ios" && /crios|fxios|edgios/i.test(env.userAgent);

  const steps = tab === "android"
    ? [
        { icon: <AndroidLogo className="h-5 w-5" />, title: "Hent appen", text: `Tryk på knappen nedenfor (${APK_MB} MB).` },
        { icon: <Check className="h-5 w-5" />, title: "Åbn filen", text: "Find den i notifikationen eller i Downloads. Tillad installation, hvis telefonen spørger." },
        { icon: <PlusSquare className="h-5 w-5" />, title: "Tryk Installer", text: "Appen ligger nu på telefonen og åbner direkte i Min dag." },
      ]
    : [
        { icon: <Share className="h-5 w-5" />, title: "Tryk på Del", text: isIosNonSafari ? "Åbn først siden i Safari, og tryk så på Del-knappen." : "Del-knappen sidder nederst i Safari." },
        { icon: <PlusSquare className="h-5 w-5" />, title: "Føj til hjemmeskærm", text: "Rul lidt ned i menuen og vælg «Føj til hjemmeskærm»." },
        { icon: <Check className="h-5 w-5" />, title: "Tryk Tilføj", text: "Appen ligger nu på hjemmeskærmen og åbner i Min dag." },
      ];

  return (
    <section aria-labelledby="app-install-title" className={cn("panel-page-hero !p-0", className)}>
      <BlueFlowBackground variant="founder" />
      <button
        type="button"
        onClick={dismiss}
        aria-label="Skjul forslag om app"
        className="absolute right-1.5 top-1.5 z-10 grid h-11 w-11 place-items-center rounded-full text-ocean-foreground/80 hover:bg-ocean-foreground/10 hover:text-ocean-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-foreground"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>

      <div className="relative grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-8">
        <div className="min-w-0">
          <div className="flex items-center gap-3 pr-10">
            <img src="/apple-touch-icon.png" alt="" width={52} height={52} className="h-13 w-13 shrink-0 rounded-[14px] shadow-lg ring-1 ring-ocean-foreground/25" style={{ height: 52, width: 52 }} />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ocean-foreground/70">Medarbejder-app</p>
              <h3 id="app-install-title" className="text-xl font-bold leading-tight text-ocean-foreground sm:text-2xl">Din dag – lige i lommen</h3>
            </div>
          </div>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-ocean-foreground/85">
            Se ruter, start dagen og registrér tid med ét tryk fra telefonens hjemmeskærm. Gratis for Android og iPhone.
          </p>

          <div role="tablist" aria-label="Vælg telefon" className="mt-4 inline-flex rounded-full bg-ocean/60 p-1 ring-1 ring-ocean-foreground/25">
            {order.map((key) => (
              <button
                key={key}
                role="tab"
                type="button"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-foreground",
                  tab === key ? "hero-action-light" : "text-ocean-foreground hover:bg-ocean-foreground/10",
                )}
              >
                {key === "android" ? <AndroidLogo className="h-4 w-4" /> : <AppleLogo className="h-4 w-4" />}
                {key === "android" ? "Android" : "iPhone"}
                {platform === key && <span className="hidden rounded-full bg-accent/15 px-1.5 text-[10px] font-semibold sm:inline">Din telefon</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0" role="tabpanel">
          <ol className="grid gap-2 sm:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="relative rounded-md bg-ocean-foreground/[0.08] p-3 ring-1 ring-ocean-foreground/15 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ocean-foreground text-xs font-bold text-ocean">{i + 1}</span>
                  <span className="text-ocean-foreground/80">{step.icon}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-ocean-foreground">{step.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ocean-foreground/80">{step.text}</p>
              </li>
            ))}
          </ol>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {tab === "android" ? (
              <a
                href={apkAsset.url}
                download="Serviceydere-Medarbejder.apk"
                className="hero-action-light inline-flex h-12 w-full items-center justify-center gap-3 sm:w-auto sm:justify-start rounded-md px-5 text-sm font-semibold focus-visible:outline-none"
              >
                <AndroidLogo className="h-5 w-5" />
                <span className="flex flex-col leading-tight"><span className="text-[10px] font-medium opacity-70">Hent til</span>Android</span>
              </a>
            ) : (
              <p className="text-xs text-ocean-foreground/75">Virker i Safari på iPhone og iPad.</p>
            )}
            {tab === "android" && prompt && (
              <button type="button" onClick={addToHomeScreen} className="min-h-11 text-sm font-semibold text-ocean-foreground underline underline-offset-4">
                Eller tilføj til hjemmeskærm
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

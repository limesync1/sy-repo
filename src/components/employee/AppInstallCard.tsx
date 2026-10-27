import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Check, PlusSquare, Share, X } from "lucide-react";
import apkAsset from "@/assets/downloads/serviceydere-medarbejder.apk.asset.json";
import { cn } from "@/lib/utils";
import { SectionLabelMark } from "@/components/shared/UiArtwork";
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
        { icon: <AndroidLogo className="h-5 w-5" />, title: "Hent appen", text: "Tryk på den hvide knap nedenfor." },
        { icon: <Check className="h-5 w-5" />, title: "Åbn filen", text: "Find den i notifikationen eller i Downloads. Tillad installation, hvis telefonen spørger." },
        { icon: <PlusSquare className="h-5 w-5" />, title: "Tryk Installer", text: "Appen ligger nu på telefonen og åbner direkte i Min dag." },
      ]
    : [
        { icon: <Share className="h-5 w-5" />, title: "Tryk på Del", text: isIosNonSafari ? "Åbn først siden i Safari, og tryk så på Del-knappen." : "Del-knappen sidder nederst i Safari." },
        { icon: <PlusSquare className="h-5 w-5" />, title: "Føj til hjemmeskærm", text: "Rul lidt ned i menuen og vælg «Føj til hjemmeskærm»." },
        { icon: <Check className="h-5 w-5" />, title: "Tryk Tilføj", text: "Appen ligger nu på hjemmeskærmen og åbner i Min dag." },
      ];

  return (
    <section aria-labelledby="app-install-title" className={cn("home-process brand-blue-section relative isolate overflow-hidden rounded-lg text-ocean-foreground", className)}>
      <BlueFlowBackground variant="process" />
      <button
        type="button"
        onClick={dismiss}
        aria-label="Skjul forslag om app"
        className="absolute right-2 top-2 z-10 grid h-11 w-11 place-items-center rounded-full text-ocean-foreground/70 hover:bg-ocean-foreground/10 hover:text-ocean-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-foreground"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>

      <div className="relative px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-5 pr-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-ocean-foreground/65">
              <SectionLabelMark />
              Medarbejder-app
            </span>
            <h3 id="app-install-title" className="mt-4 text-[1.6rem] font-semibold leading-[1.08] sm:text-[2rem]">
              Hav din dag med i lommen
            </h3>
            <p className="mt-3 max-w-lg text-[15px] leading-7 text-ocean-foreground/70">
              Se ruter, start dagen og registrér tid direkte fra telefonens hjemmeskærm. Gratis til Android og iPhone.
            </p>
          </div>

          <div role="tablist" aria-label="Vælg telefon" className="inline-flex w-fit shrink-0 rounded-full border border-ocean-foreground/25 p-1">
            {order.map((key) => (
              <button
                key={key}
                role="tab"
                type="button"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-foreground",
                  tab === key ? "hero-action-light" : "text-ocean-foreground/80 hover:bg-ocean-foreground/10 hover:text-ocean-foreground",
                )}
              >
                {key === "android" ? <AndroidLogo className="h-4 w-4" /> : <AppleLogo className="h-4 w-4" />}
                {key === "android" ? "Android" : "iPhone"}
              </button>
            ))}
          </div>
        </div>

        <ol role="tabpanel" className="mt-7 grid gap-3 md:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="home-step rounded-lg border border-ocean-foreground/20 p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ocean-foreground/25 text-xs font-semibold tabular-nums">
                  {i + 1}
                </span>
                <span className="text-ocean-foreground/70">{step.icon}</span>
              </div>
              <h4 className="mt-4 text-[17px] font-semibold">{step.title}</h4>
              <p className="mt-1.5 text-[14px] leading-6 text-ocean-foreground/70">{step.text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {tab === "android" ? (
            <a
              href={apkAsset.url}
              download="Serviceydere-Medarbejder.apk"
              className="hero-action-light inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-lg px-5 text-sm font-semibold focus-visible:outline-none sm:w-auto"
            >
              <AndroidLogo className="h-5 w-5" />
              Hent appen til Android
              <span className="text-xs font-medium opacity-60">{APK_MB} MB</span>
            </a>
          ) : (
            <p className="text-sm text-ocean-foreground/70">Virker i Safari på iPhone og iPad.</p>
          )}
          {tab === "android" && prompt && (
            <button type="button" onClick={addToHomeScreen} className="inline-flex h-12 items-center rounded-lg border border-ocean-foreground/30 px-5 text-sm font-semibold hover:bg-ocean-foreground/10">
              Tilføj til hjemmeskærm
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { X } from "lucide-react";
import apkAsset from "@/assets/downloads/serviceydere-medarbejder.apk.asset.json";
import hentIcon from "@/assets/app-install/Hent_appen.svg.asset.json";
import aabnIcon from "@/assets/app-install/Aabn_filen.svg.asset.json";
import installerIcon from "@/assets/app-install/Tryk_Installer.svg.asset.json";
import delIcon from "@/assets/app-install/Tryk_paa_Del.svg.asset.json";
import foejIcon from "@/assets/app-install/Foej_til_hjemmeskaerm.svg.asset.json";
import tilfoejIcon from "@/assets/app-install/Tryk_Tilfoej.svg.asset.json";
import androidIcon from "@/assets/app-install/Android_logo.svg.asset.json";
import appleIcon from "@/assets/app-install/Apple_logo.svg.asset.json";
import safariIcon from "@/assets/app-install/Safari_ikon.svg.asset.json";
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
        { icon: hentIcon.url, title: "Hent appen", text: "Tryk på den hvide knap." },
        { icon: aabnIcon.url, title: "Åbn filen", text: "Find den i Downloads. Tillad installation, hvis telefonen spørger." },
        { icon: installerIcon.url, title: "Tryk Installer", text: "Appen åbner direkte i Min dag." },
      ]
    : [
        { icon: delIcon.url, title: "Tryk på Del", text: isIosNonSafari ? "Åbn siden i Safari først, og tryk så på Del." : "Del-knappen sidder nederst i Safari." },
        { icon: foejIcon.url, title: "Føj til hjemmeskærm", text: "Rul ned i menuen og vælg den." },
        { icon: tilfoejIcon.url, title: "Tryk Tilføj", text: "Appen åbner i Min dag." },
      ];

  return (
    <section aria-labelledby="app-install-title" className={cn("home-process brand-blue-section relative isolate overflow-hidden rounded-lg text-ocean-foreground", className)}>
      <BlueFlowBackground variant="process" />
      <button
        type="button"
        onClick={dismiss}
        aria-label="Skjul forslag om app"
        className="absolute right-1.5 top-1.5 z-10 grid h-11 w-11 place-items-center rounded-full text-ocean-foreground/70 hover:bg-ocean-foreground/10 hover:text-ocean-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-foreground"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>

      <div className="relative px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9">
        <div className="flex flex-col gap-4 pr-10 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-ocean-foreground/65">
              <SectionLabelMark />
              Medarbejder-app
            </span>
            <h3 id="app-install-title" className="mt-2.5 text-[1.3rem] font-semibold leading-tight sm:text-[1.6rem] lg:text-[1.9rem]">
              Hav din dag med i lommen
            </h3>
            <p className="mt-1.5 hidden max-w-lg text-[15px] leading-6 text-ocean-foreground/70 sm:block">
              Se ruter, start dagen og registrér tid fra hjemmeskærmen. Gratis til Android og iPhone.
            </p>
          </div>

          <div role="group" aria-label="Vælg telefon" className="grid w-full shrink-0 grid-cols-2 rounded-full border border-ocean-foreground/25 p-1 sm:inline-grid sm:w-auto">
            {order.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={tab === key}
                onClick={() => setTab(key)}
                className={cn(
                  "inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-foreground",
                  tab === key ? "hero-action-light" : "text-ocean-foreground/80 hover:bg-ocean-foreground/10 hover:text-ocean-foreground",
                )}
              >
                <img src={key === "android" ? androidIcon.url : appleIcon.url} alt="" aria-hidden className="h-5 w-5 object-contain" />
                {key === "android" ? "Android" : "iPhone"}
              </button>
            ))}
          </div>
        </div>

        <ol className="mt-4 grid gap-2 sm:mt-6 md:grid-cols-3 md:gap-3">
          {steps.map((step, i) => (
            <li key={step.title} className="home-step flex items-center gap-3 rounded-lg border border-ocean-foreground/20 p-3 md:flex-col md:items-start md:gap-0 md:p-4">
              <div className="relative shrink-0">
                <span className="grid h-12 w-12 place-items-center rounded-lg bg-ocean-foreground md:h-14 md:w-14">
                  <img src={step.icon} alt="" aria-hidden className="h-9 w-9 object-contain md:h-10 md:w-10" />
                </span>
                <span className="absolute -left-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ocean-foreground text-[11px] font-bold tabular-nums text-ocean ring-2 ring-ocean">
                  {i + 1}
                </span>
              </div>
              <div className="min-w-0 md:mt-3">
                <h4 className="text-[15px] font-semibold leading-snug md:text-[16px]">{step.title}</h4>
                <p className="mt-0.5 text-[13px] leading-5 text-ocean-foreground/70 md:text-[14px]">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          {tab === "android" ? (
            <a
              href={apkAsset.url}
              download="Serviceydere-Medarbejder.apk"
              className="hero-action-light inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-lg px-5 text-sm font-semibold focus-visible:outline-none sm:w-auto"
            >
              <img src={androidIcon.url} alt="" aria-hidden className="h-5 w-5 object-contain" />
              Hent appen til Android
              <span className="text-xs font-medium opacity-60">{APK_MB} MB</span>
            </a>
          ) : (
            <p className="flex items-center gap-2 text-sm text-ocean-foreground/75">
              <img src={safariIcon.url} alt="" aria-hidden className="h-5 w-5 object-contain" />
              Virker i Safari på iPhone og iPad.
            </p>
          )}
          {tab === "android" && prompt && (
            <button type="button" onClick={addToHomeScreen} className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-ocean-foreground/30 px-5 text-sm font-semibold hover:bg-ocean-foreground/10 sm:w-auto">
              Tilføj til hjemmeskærm
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

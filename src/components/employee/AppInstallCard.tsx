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
import safariIcon from "@/assets/app-install/Safari_ikon.svg.asset.json";
import appleLogo from "@/assets/app-install/Apple_logo.svg.asset.json";
import { cn } from "@/lib/utils";
import { SectionLabelMark } from "@/components/shared/UiArtwork";
import { detectInstallPlatform, installOptionOrder, isAppInstalled, type InstallPlatform } from "@/lib/app-install";

const DISMISS_KEY = "sy-app-install-dismissed";
const APK_MB = Math.round((apkAsset.size / 1024 / 1024) * 10) / 10;
const APK_FILENAME = "Serviceydere-Medarbejder.apk";
const APK_MIME = "application/vnd.android.package-archive";

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
 * Let baggrund (panel-stil), mørk tekst — bevidst ikke en mørk hero.
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
  // Download styres i appen: fremdriftslinje + gem som fil, så Android-Chrome
  // ikke kan hænge ved 100 %, mens den venter på sin egen filfinalisering.
  const [progress, setProgress] = useState<number | null>(null);
  const [dlError, setDlError] = useState(false);

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

  const saveApkBlob = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = APK_FILENAME;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoke sentligt senere — for tidlig revoke kan afbryde en igangværende gemning.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const startAndroidDownload = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    // Efter en fejl lader vi browserens egen download tage over.
    if (dlError || typeof fetch === "undefined") return;
    if (progress !== null) { event.preventDefault(); return; }
    event.preventDefault();
    setProgress(0);
    setDlError(false);
    try {
      const res = await fetch(apkAsset.url, { cache: "force-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const total = Number(res.headers.get("content-length")) || apkAsset.size;
      if (!res.body || typeof res.body.getReader !== "function") {
        saveApkBlob(await res.blob());
        setProgress(100);
        window.setTimeout(() => setProgress(null), 2500);
        return;
      }
      const reader = res.body.getReader();
      const chunks: BlobPart[] = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          setProgress(Math.min(99, Math.round((received / total) * 100)));
        }
      }
      saveApkBlob(new Blob(chunks, { type: APK_MIME }));
      setProgress(100);
      window.setTimeout(() => setProgress(null), 2500);
    } catch {
      setDlError(true);
      setProgress(null);
    }
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
        { icon: hentIcon.url, title: "Hent appen", text: "Tryk på den mørke knap." },
        { icon: aabnIcon.url, title: "Åbn filen", text: "Find den i Downloads. Tillad installation, hvis telefonen spørger." },
        { icon: installerIcon.url, title: "Tryk Installer", text: "Appen åbner direkte i Min dag." },
      ]
    : [
        { icon: delIcon.url, title: "Tryk på Del", text: isIosNonSafari ? "Åbn siden i Safari først, og tryk så på Del." : "Del-knappen sidder nederst i Safari." },
        { icon: foejIcon.url, title: "Føj til hjemmeskærm", text: "Rul ned i menuen og vælg den." },
        { icon: tilfoejIcon.url, title: "Tryk Tilføj", text: "Appen åbner i Min dag." },
      ];

  return (
    <section
      aria-labelledby="app-install-title"
      className={cn("relative isolate overflow-hidden rounded-lg border border-border/60 text-foreground", className)}
      style={{
        backgroundColor: "hsl(var(--surface))",
        backgroundImage: "linear-gradient(135deg, hsl(var(--hero-cyan) / 0.09), hsl(var(--hero-mid) / 0.06))",
      }}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Skjul forslag om app"
        className="absolute right-1.5 top-1.5 z-10 grid h-11 w-11 place-items-center rounded-full text-muted-foreground hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>

      <div className="relative mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
        <div className="pr-10">
          <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            <SectionLabelMark />
            Medarbejder-app
          </span>
          <h3 id="app-install-title" className="mt-2 text-[1.35rem] font-semibold leading-tight sm:text-[1.65rem] lg:text-[1.9rem]">
            Hav din dag med i lommen
          </h3>
          <p className="mt-1 max-w-xl text-[14px] leading-6 text-muted-foreground">
            Ruter, arbejdsdag og tid – direkte fra hjemmeskærmen. Gratis.
          </p>
        </div>

        {/* Platformvalg som rigtige app-badges */}
        <div role="group" aria-label="Vælg telefon" className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:max-w-md sm:gap-3">
          {order.map((key) => {
            const active = tab === key;
            const isAndroid = key === "android";
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => setTab(key)}
                className="flex min-h-[56px] items-center gap-3 rounded-xl border-2 px-3 py-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                style={{
                  borderColor: active ? "hsl(var(--hero-mid))" : "hsl(var(--border))",
                  background: active ? "hsl(var(--hero-cyan) / 0.10)" : "hsl(var(--card))",
                }}
              >
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] shadow-sm"
                  style={{ background: isAndroid ? "hsl(var(--foreground))" : "hsl(var(--brand-apple-bg))", color: isAndroid ? "hsl(var(--brand-android))" : "hsl(var(--brand-apple-fg))" }}
                >
                  {isAndroid ? <AndroidLogo className="h-6 w-6" /> : <AppleLogo className="h-6 w-6 -translate-y-px" />}
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block text-[11px] font-medium text-muted-foreground">
                    {platform === key ? "Din telefon" : "Til"}
                  </span>
                  <span className="block text-[15px] font-semibold text-foreground">{isAndroid ? "Android" : "iPhone"}</span>
                </span>
              </button>
            );
          })}
        </div>

        <ol className="mt-4 grid gap-2 sm:mt-5 md:grid-cols-3 md:gap-3">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm md:flex-col md:items-start md:gap-3 md:p-4"
            >
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-border bg-background shadow-sm">
                <img src={step.icon} alt="" aria-hidden className="h-11 w-11 object-contain" />
              </span>
              <div className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Trin {i + 1}
                </span>
                <h4 className="text-[16px] font-semibold leading-snug text-foreground">{step.title}</h4>
                <p className="mt-0.5 text-[14px] leading-5 text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          {tab === "android" ? (
            <a
              href={apkAsset.url}
              download="Serviceydere-Medarbejder.apk"
              className="hero-action-dark inline-flex min-h-[52px] w-full items-center justify-center gap-3 rounded-xl px-5 text-[15px] font-semibold focus-visible:outline-none sm:w-auto"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-background shadow-sm" style={{ color: "hsl(var(--brand-android))" }}>
                <AndroidLogo className="h-5 w-5" />
              </span>
              Hent appen til Android
              <span className="text-xs font-medium opacity-60">{APK_MB} MB</span>
            </a>
          ) : (
            <div className="hero-action-dark inline-flex min-h-[52px] w-full items-center justify-center gap-3 rounded-xl px-5 text-[15px] font-semibold sm:w-auto">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-background shadow-sm">
                <img src={isIosNonSafari ? safariIcon.url : appleLogo.url} alt="" aria-hidden className="h-6 w-6 object-contain" />
              </span>
              {isIosNonSafari ? "Åbn siden i Safari først." : "Virker i Safari på iPhone og iPad."}
            </div>
          )}
          {tab === "android" && prompt && (
            <button type="button" onClick={addToHomeScreen} className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:border-foreground/40 sm:w-auto">
              Tilføj til hjemmeskærm
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

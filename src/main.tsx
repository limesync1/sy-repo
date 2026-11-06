import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Capacitor } from "@capacitor/core";
import { captureFirstTouch } from "./lib/first-touch";

if (typeof window !== "undefined" && !Capacitor.isNativePlatform()) captureFirstTouch();

// In the native app, keep content clear of the status bar and system navigation
// buttons: the web view is inset natively instead of drawing edge-to-edge.
if (Capacitor.isNativePlatform()) {
  document
    .querySelector('meta[name="viewport"]')
    ?.setAttribute("content", "width=device-width, initial-scale=1.0, viewport-fit=contain");
}
if (Capacitor.isNativePlatform()) {
  document.documentElement.classList.add("native-app");
  // The app opens on the role choice, never the public homepage.
  if (window.location.pathname === "/") window.history.replaceState(null, "", "/app");
  void import("./lib/native-shell").then((m) => m.initNativeShell());
}

// Gem browserens installationstilbud, så "Tilføj til hjemmeskærm" på Min dag
// kan bruge det, selv om siden indlæses efter at browseren har sendt det.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    (window as unknown as { __syInstallPrompt?: Event }).__syInstallPrompt = e;
    window.dispatchEvent(new Event("sy-install-available"));
  });
}


/* ─── Smooth image loading ───
   Markerer alle <img loading="lazy"> med data-loaded når de er hentet,
   så CSS'en kan fade dem blødt ind. En enkelt capturing-listener dækker
   hele DOM'en — også billeder der mountes senere i React-træet. */
if (typeof window !== "undefined") {
  const markLoaded = (img: HTMLImageElement) => {
    img.setAttribute("data-loaded", "true");
  };
  // Cachede billeder fyrer ikke 'load' efter mount — fang dem via MutationObserver.
  const handleImg = (img: HTMLImageElement) => {
    if (img.getAttribute("loading") !== "lazy") return;
    if (img.complete && img.naturalWidth > 0) {
      markLoaded(img);
    }
  };
  document.addEventListener(
    "load",
    (e) => {
      const t = e.target as HTMLElement | null;
      if (t && t.tagName === "IMG") markLoaded(t as HTMLImageElement);
    },
    true,
  );
  document.addEventListener(
    "error",
    (e) => {
      const t = e.target as HTMLElement | null;
      if (t && t.tagName === "IMG") t.classList.add("is-error");
    },
    true,
  );
  // Observer for cached/already-complete images injiceret af React.
  const mo = new MutationObserver((records) => {
    for (const r of records) {
      r.addedNodes.forEach((n) => {
        if (n.nodeType !== 1) return;
        const el = n as HTMLElement;
        if (el.tagName === "IMG") handleImg(el as HTMLImageElement);
        el.querySelectorAll?.("img").forEach((img) => handleImg(img as HTMLImageElement));
      });
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
}

createRoot(document.getElementById("root")!).render(<App />);

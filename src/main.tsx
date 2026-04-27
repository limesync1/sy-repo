import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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

import { useEffect } from "react";
import BusinessCover from "@/components/shared/media/BusinessCover";
import BusinessLogo from "@/components/shared/media/BusinessLogo";

/**
 * Visual regression fixture for virksomhedsbilleder.
 *
 * Vi tester at logoer og coverbilleder ALDRIG bliver strakt/presset,
 * uanset kildebilledets format. Derfor genererer vi lokale SVG-billeder
 * som data-URL'er i ekstreme formater (panorama, portræt, kvadrat) — så
 * testen kører uden netværk og uden storage-data.
 *
 * Rammer vi ønsker at fastholde:
 *  - cover holder sit aspect ratio og beskærer centreret
 *  - logo står centreret i et kvadrat med `object-contain` (ingen skævvridning)
 *  - fallback (intet billede) fylder præcis samme plads som et billede
 */
const svg = (w: number, h: number, label: string, bg: string) =>
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<rect width="${w}" height="${h}" fill="${bg}"/>` +
      `<circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 3}" fill="#ffffff" opacity="0.85"/>` +
      `<text x="${w / 2}" y="${h - 8}" font-family="sans-serif" font-size="14" fill="#ffffff" text-anchor="middle">${label}</text>` +
      "</svg>",
  );

const PANORAMA = svg(1600, 300, "panorama", "#0f4c5c");
const PORTRAIT = svg(400, 900, "portraet", "#6b3fa0");
const SQUARE = svg(600, 600, "kvadrat", "#1d6f42");
const WIDE_LOGO = svg(600, 120, "logo-bred", "#c2410c");
const TALL_LOGO = svg(120, 600, "logo-hoej", "#0369a1");

export default function VisualTestMedia() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const mode = params.get("mode") ?? "light";

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(mode === "dark" ? "dark" : "light");
    const style = document.createElement("style");
    style.id = "vt-media-no-motion";
    style.textContent = `*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }`;
    document.head.appendChild(style);
    return () => style.remove();
  }, [mode]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div data-testid="media-covers" className="grid w-[1100px] grid-cols-4 gap-4">
        {[
          { url: PANORAMA, label: "panorama" },
          { url: PORTRAIT, label: "portræt" },
          { url: SQUARE, label: "kvadrat" },
          { url: null, label: "intet cover" },
        ].map((c) => (
          <div key={c.label} data-testid={`cover-${c.label}`} className="overflow-hidden rounded-2xl border border-border bg-card">
            <BusinessCover url={c.url} name="Testvirksomhed" ratio="16/10" />
            <p className="px-3 py-2 text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <div data-testid="media-logos" className="mt-8 flex w-[1100px] items-center gap-6 rounded-2xl border border-border bg-card p-6">
        {[
          { url: WIDE_LOGO, label: "bredt" },
          { url: TALL_LOGO, label: "hoejt" },
          { url: SQUARE, label: "kvadratisk" },
          { url: null, label: "intet" },
        ].map((l) => (
          <div key={l.label} data-testid={`logo-${l.label}`} className="flex flex-col items-center gap-2">
            <BusinessLogo url={l.url} name="Testvirksomhed" size={56} />
            <span className="text-[11px] text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>

      <div data-testid="media-cover-ratios" className="mt-8 w-[1100px] space-y-4">
        {(["16/6", "16/9", "3/2", "1/1"] as const).map((r) => (
          <div key={r} data-testid={`ratio-${r.replace("/", "-")}`} className="overflow-hidden rounded-2xl border border-border">
            <BusinessCover url={PORTRAIT} name="Testvirksomhed" ratio={r} />
          </div>
        ))}
      </div>
    </div>
  );
}

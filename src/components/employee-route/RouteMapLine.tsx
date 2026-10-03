import { useEffect, useId } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

/**
 * Leaflet sætter farver som SVG-attributter, hvor `var()` ikke opløses —
 * så CSS-tokens skal slås op til konkrete værdier, før de gives til kortet.
 */
export function resolveMapColor(token: string, fallback: string): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return raw ? `hsl(${raw})` : fallback;
}

/** Road geometry stays unchanged; SVG supplies the shared brand gradient. */
export function RouteMapLine({ points, muted = false }: { points: [number, number][]; muted?: boolean }) {
  const map = useMap();
  const id = `route-line-${useId().replace(/:/g, "")}`;
  useEffect(() => {
    if (points.length < 2) return;
    const casingColor = resolveMapColor("--route-line-casing", "hsl(0 0% 100%)");
    const lineStart = resolveMapColor("--brand-blue-start", "hsl(195 68% 55%)");
    const lineEnd = resolveMapColor("--brand-blue-end", "hsl(198 71% 35%)");
    const renderer = L.svg({ padding: 0.5 });
    const casing = L.polyline(points, { renderer, color: casingColor, weight: muted ? 7 : 9, opacity: 0.95, interactive: false }).addTo(map);
    const line = L.polyline(points, { renderer, color: lineEnd, weight: muted ? 3 : 5, opacity: muted ? 0.45 : 1, interactive: false }).addTo(map);
    const path = line.getElement();
    const svg = path instanceof SVGElement ? path.ownerSVGElement : null;
    if (path && svg) {
      const ns = "http://www.w3.org/2000/svg";
      const defs = document.createElementNS(ns, "defs");
      const gradient = document.createElementNS(ns, "linearGradient");
      gradient.id = id;
      // A screen-space diagonal remains valid for perfectly horizontal/vertical roads.
      gradient.setAttribute("gradientUnits", "userSpaceOnUse");
      gradient.setAttribute("x1", "0"); gradient.setAttribute("y1", "0");
      gradient.setAttribute("x2", "600"); gradient.setAttribute("y2", "600");
      for (const [offset, color] of [["0%", lineStart], ["100%", lineEnd]] as const) {
        const stop = document.createElementNS(ns, "stop");
        stop.setAttribute("offset", offset);
        stop.setAttribute("stop-color", color);
        gradient.appendChild(stop);
      }
      defs.appendChild(gradient); svg.prepend(defs);
      path.setAttribute("stroke", `url(#${id})`);
    }
    return () => { line.remove(); casing.remove(); renderer.remove(); };
  }, [map, points, muted, id]);
  return null;
}

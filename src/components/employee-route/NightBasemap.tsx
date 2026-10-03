import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import "maplibre-gl/dist/maplibre-gl.css";

// Vite must serve the bundled worker from its actual asset URL, not the
// dependency optimizer directory (which otherwise returns 404).
setWorkerUrl(workerUrl);

/** Vector night style on the rotating tile pane, below existing route layers. */
export function NightBasemap({ retry, onFailure }: { retry: number; onFailure: (failed: boolean) => void }) {
  const map = useMap();
  useEffect(() => {
    let active = true;
    let layer: ReturnType<typeof maplibreGL> | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const attribution = '© <a href="https://openfreemap.org/" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> · © OpenMapTiles · © OpenStreetMap';
    const fail = () => {
      if (!active) return;
      if (layer) layer.getContainer().style.visibility = "hidden";
      onFailure(true);
    };
    const load = async () => { try {
      timeout = setTimeout(() => { fail(); controller.abort(); }, 15_000);
      const response = await fetch("https://tiles.openfreemap.org/styles/dark", { signal: controller.signal });
      if (!response.ok) throw new Error("Night style unavailable");
      const style = await response.json();
      const owner = map.getContainer().closest(".employee-route-run") ?? map.getContainer();
      const tokens = getComputedStyle(owner);
      const color = (name: string) => `hsl(${tokens.getPropertyValue(name).trim()})`;
      for (const item of style.layers) {
        item.paint ??= {};
        if (item.type === "background") item.paint["background-color"] = color("--night-map-land");
        if (item.type === "fill") item.paint["fill-color"] = color(item.id.includes("water") ? "--night-map-water" : item.id.includes("building") ? "--night-map-building" : item.id.includes("wood") || item.id.includes("park") ? "--night-map-park" : "--night-map-land");
        if (item.type === "line" && /highway|road_|aeroway/.test(item.id)) item.paint["line-color"] = color(item.id.includes("casing") ? "--night-map-casing" : "--night-map-road");
        if (item.type === "symbol") {
          item.paint["text-color"] = color("--night-map-label");
          item.paint["text-halo-color"] = color("--night-map-land");
          item.paint["text-halo-width"] = 1.5;
        }
      }
      if (!active) return;
      // Plugin-specific overscan is absent from its published option type.
      const options = { style, interactive: false, attributionControl: false as const, padding: 0.5 };
      layer = maplibreGL(options).addTo(map);
      // Raster GridLayer has z-index 1; otherwise it hides the vector map.
      layer.getContainer().style.zIndex = "2";
      layer.getContainer().style.visibility = "hidden";
      const gl = layer.getMaplibreMap();
      gl.on("error", fail);
      gl.on("idle", () => {
        if (active && gl.isStyleLoaded() && gl.areTilesLoaded()) {
          if (timeout) clearTimeout(timeout);
          if (layer) layer.getContainer().style.visibility = "visible";
          onFailure(false);
        }
      });
      map.attributionControl?.addAttribution(attribution);
    } catch { if (active) fail(); } };
    void load();
    return () => {
      active = false;
      controller.abort();
      if (timeout) clearTimeout(timeout);
      if (layer && map.hasLayer(layer)) map.removeLayer(layer);
      map.attributionControl?.removeAttribution(attribution);
    };
  }, [map, retry, onFailure]);
  return null;
}
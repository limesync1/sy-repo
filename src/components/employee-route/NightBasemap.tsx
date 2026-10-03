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
    const attribution = '© <a href="https://openfreemap.org/" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> · © OpenMapTiles · © OpenStreetMap';
    const fail = () => {
      if (!active) return;
      if (layer) layer.getContainer().style.visibility = "hidden";
      onFailure(true);
    };
    try {
      // Plugin-specific overscan is absent from its published option type.
      const options = { style: "https://tiles.openfreemap.org/styles/dark", interactive: false, attributionControl: false as const, padding: 0.5 };
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
      timeout = setTimeout(fail, 15_000);
      map.attributionControl?.addAttribution(attribution);
    } catch { fail(); }
    return () => {
      active = false;
      if (timeout) clearTimeout(timeout);
      if (layer && map.hasLayer(layer)) map.removeLayer(layer);
      map.attributionControl?.removeAttribution(attribution);
    };
  }, [map, retry, onFailure]);
  return null;
}
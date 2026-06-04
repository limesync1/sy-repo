/**
 * SimulationPreviewOverlay — Bølge 5 / 5.1
 * -----------------------------------------------------------------------------
 * Reads the live "What-if"-preview fra `useSimulationPreview()` og rendrer
 * `SimulationDiffPanel` flydende nederst-til-højre i viewporten under et drag.
 * Tilføjes én gang i RoutePlanner — kræver ingen props.
 */
import { useSimulationPreview } from "./simulation-preview-context";
import { SimulationDiffPanel } from "./SimulationDiffPanel";

export function SimulationPreviewOverlay() {
  const preview = useSimulationPreview();
  if (!preview) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
      <SimulationDiffPanel summary={preview.summary} label={preview.label} />
    </div>
  );
}
// Floating ETA-chip der følger musen under drag og fortæller hvad slip
// vil koste: ekstra køretid, ny kapacitets-% og en kort severity-besked
// (grøn/gul/rød) — så brugeren ikke behøver slippe for at få feedback.
//
// Læser data fra drag-validation-context (allerede populeret af RoutePlanner
// under drag-over). Ekstra ETA-felter sættes via `setDragEta` herfra.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSyncExternalStore } from "react";
import { chipBgForSeverity } from "./drag-validation-context";
import type { TargetValidation } from "./drag-validation-context";

// ── Egen mini-store for ekstra ETA-info (parallelt med severity) ──
export type DragEta = {
  extraDriveMin?: number | null;
  newLoadPct?: number | null;
  message?: string | null;
};

let etaCurrent: DragEta | null = null;
const etaListeners = new Set<() => void>();
const etaEmit = () => { for (const l of etaListeners) l(); };
const etaSubscribe = (l: () => void) => { etaListeners.add(l); return () => { etaListeners.delete(l); }; };
const etaGet = () => etaCurrent;

export function setDragEta(eta: DragEta | null) {
  etaCurrent = eta;
  etaEmit();
}
export function clearDragEta() { setDragEta(null); }

// ── Severity-chip subscriber (genbruger modul-singleton) ──
import { useTargetValidation } from "./drag-validation-context";

type Props = {
  /** Det aktive drop-target-id (fx "route:abc"). */
  targetId: string | null;
};

export default function DragEtaOverlay({ targetId }: Props) {
  const validation: TargetValidation | null = useTargetValidation(targetId);
  const eta = useSyncExternalStore(etaSubscribe, etaGet, () => null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!targetId) { setPos(null); return; }
    const onMove = (e: PointerEvent | MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [targetId]);

  if (!targetId || !pos) return null;

  const severity = validation?.severity ?? "ok";
  const bg = chipBgForSeverity(severity);
  const lines: string[] = [];
  if (validation?.topMessage) lines.push(validation.topMessage);
  if (eta?.extraDriveMin != null) lines.push(`+${Math.round(eta.extraDriveMin)} min kørsel`);
  if (eta?.newLoadPct != null) lines.push(`Kapacitet ${Math.round(eta.newLoadPct)}%`);
  if (eta?.message) lines.push(eta.message);

  if (lines.length === 0) return null;

  return createPortal(
    <div
      className={`pointer-events-none fixed z-[100] rounded-md px-2 py-1 text-[11px] font-medium shadow-lg ${bg}`}
      style={{ left: pos.x + 14, top: pos.y + 14 }}
    >
      {lines.map((l, i) => <div key={i}>{l}</div>)}
    </div>,
    document.body,
  );
}
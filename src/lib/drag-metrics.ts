/**
 * Drag-metrics — let-vægts målinger til ruteplanlæggerens drag-and-drop.
 *
 * Vi sporer:
 *  - **Drag-to-drop latency**: tid fra `DragStart` til vellykket `DragEnd`
 *    (kun når brugeren faktisk dropper på et target).
 *  - **Klik-fejlrate**: andelen af drag-forsøg der ender uden et drop
 *    (annulleret/sluppet uden over-target). På Windows-touchpads og
 *    Android registrerer browseren ofte små bevægelser som drag-start
 *    selvom brugeren ville klikke — den fejlrate er hvad vi vil sænke.
 *
 * Data gemmes i sessionStorage så det kan inspiceres på tværs af reloads,
 * og platform (windows/android/ios/mac/linux) udledes af userAgent så vi
 * kan se forbedringerne pr. enhedstype.
 *
 * Inspicér i konsollen med:
 *   window.__dragMetrics.summary()      // p50/p95 latency + click-error rate
 *   window.__dragMetrics.byPlatform()   // samme, opdelt pr. platform
 *   window.__dragMetrics.reset()        // nulstil
 */

type DragRecord = {
  ts: number;            // unix ms ved dragStart
  type: "job" | "route" | "stop" | "unknown";
  platform: Platform;
  latencyMs: number | null;   // null = annulleret (klik-fejl)
  dropped: boolean;
};

type Platform = "windows" | "android" | "ios" | "mac" | "linux" | "other";

const STORAGE_KEY = "rp:drag-metrics:v1";
const MAX_RECORDS = 500;

const detectPlatform = (): Platform => {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("android")) return "android";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) return "ios";
  if (ua.includes("windows")) return "windows";
  if (ua.includes("mac os") || ua.includes("macintosh")) return "mac";
  if (ua.includes("linux")) return "linux";
  return "other";
};

const PLATFORM = detectPlatform();

const readAll = (): DragRecord[] => {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DragRecord[]) : [];
  } catch { return []; }
};

const writeAll = (records: DragRecord[]) => {
  if (typeof sessionStorage === "undefined") return;
  try {
    // Trim ældste når vi rammer loftet — sessionStorage er ~5MB, men vi
    // holder os under 500 records for at undgå at JSON-parsen sluger CPU.
    const trimmed = records.length > MAX_RECORDS
      ? records.slice(-MAX_RECORDS)
      : records;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch { /* quota fyldt — drop stille */ }
};

let pendingStart: { ts: number; type: DragRecord["type"] } | null = null;

export const dragMetrics = {
  /** Kald ved dnd-kit `onDragStart`. */
  start(type: DragRecord["type"]) {
    pendingStart = { ts: performance.now(), type };
  },

  /** Kald ved dnd-kit `onDragEnd`. `dropped=true` når der var et gyldigt over-target. */
  end(dropped: boolean) {
    if (!pendingStart) return;
    const latencyMs = dropped ? Math.round(performance.now() - pendingStart.ts) : null;
    const records = readAll();
    records.push({
      ts: Date.now(),
      type: pendingStart.type,
      platform: PLATFORM,
      latencyMs,
      dropped,
    });
    writeAll(records);
    pendingStart = null;
  },

  /** Aggregér latency + klik-fejlrate på tværs af alle records. */
  summary() {
    return summarize(readAll());
  },

  /** Samme, opdelt pr. platform. */
  byPlatform() {
    const all = readAll();
    const out: Record<string, ReturnType<typeof summarize>> = {};
    for (const p of new Set(all.map((r) => r.platform))) {
      out[p] = summarize(all.filter((r) => r.platform === p));
    }
    return out;
  },

  reset() {
    pendingStart = null;
    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(STORAGE_KEY);
  },

  /** Rå records — primært til debug og evt. fremtidig upload. */
  raw(): DragRecord[] { return readAll(); },
};

const summarize = (records: DragRecord[]) => {
  const total = records.length;
  const drops = records.filter((r) => r.dropped);
  const cancels = records.length - drops.length;
  const latencies = drops.map((r) => r.latencyMs ?? 0).sort((a, b) => a - b);
  const pct = (p: number) => latencies.length === 0
    ? null
    : latencies[Math.min(latencies.length - 1, Math.floor((latencies.length - 1) * p))];
  return {
    total,
    drops: drops.length,
    cancels,
    clickErrorRate: total === 0 ? 0 : Number((cancels / total).toFixed(3)),
    p50LatencyMs: pct(0.5),
    p95LatencyMs: pct(0.95),
    avgLatencyMs: drops.length === 0
      ? null
      : Math.round(drops.reduce((sum, r) => sum + (r.latencyMs ?? 0), 0) / drops.length),
  };
};

// Expose på window i dev så man hurtigt kan tjekke tallene fra konsollen.
if (typeof window !== "undefined") {
  (window as any).__dragMetrics = dragMetrics;
}
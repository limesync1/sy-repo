// usePerfMark — let-vægts måling af fane-loadtid + render-tid.
// Logges kun i development så production-bundlet ikke får ekstra støj.
// Bruges i Admin/PlatformAdmin via <TabPerfTracker tab="dashboard" />.
import { useEffect, useRef } from "react";

const isDev = (() => {
  try {
    return Boolean((import.meta as any).env?.DEV);
  } catch {
    return false;
  }
})();

/**
 * Måler tiden fra komponenten mounter til første "commit" er færdig.
 * Brug det øverst i en tab-wrapper for at få et tal pr. fane-skift.
 */
export const usePerfMark = (label: string) => {
  const t0 = useRef<number>(0);
  if (t0.current === 0) t0.current = performance.now();

  useEffect(() => {
    if (!isDev) return;
    const mountMs = performance.now() - t0.current;
    // Vent på næste frame for at fange render-tiden incl. paint
    const raf = requestAnimationFrame(() => {
      const paintMs = performance.now() - t0.current;
      // eslint-disable-next-line no-console
      console.info(
        `%c[perf] ${label}`,
        "color:#0891b2;font-weight:600",
        `mount ${mountMs.toFixed(0)}ms · paint ${paintMs.toFixed(0)}ms`,
      );
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

/** Render-loaded tracker — drop-in i hver fane så vi får ensartet log. */
export const TabPerfTracker = ({ tab }: { tab: string }) => {
  usePerfMark(`tab:${tab}`);
  return null;
};

export default usePerfMark;
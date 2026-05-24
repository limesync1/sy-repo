/**
 * useAdaptivePageSize — vælger en fornuftig sidestørrelse afhængigt af
 * enhedens kapacitet (deviceMemory, hardwareConcurrency, netværk).
 *
 *  - Svage enheder / langsomt net  →  10 emner pr. side
 *  - Mellem (default)               →  25 emner pr. side
 *  - Stærke enheder                 →  50 emner pr. side
 *
 * Bruges sammen med `PaginationFooter` til at sikre at admin-lister aldrig
 * forsøger at rendere tusindvis af rækker på en gang.
 */
import { useMemo } from "react";

export function useAdaptivePageSize(base = 25): number {
  return useMemo(() => {
    if (typeof navigator === "undefined") return base;
    const nav = navigator as any;
    const mem: number | undefined = nav.deviceMemory;
    const cores: number | undefined = nav.hardwareConcurrency;
    const conn = nav.connection?.effectiveType as string | undefined;
    const saveData = !!nav.connection?.saveData;

    if (saveData || conn === "slow-2g" || conn === "2g") return 10;
    if ((mem && mem <= 2) || (cores && cores <= 2)) return 10;
    if ((mem && mem >= 8) && (cores && cores >= 8)) return Math.max(base, 50);
    return base;
  }, [base]);
}
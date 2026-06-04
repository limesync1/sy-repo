/**
 * Projection LRU cache — Bølge 4 / 4.2 i .lovable/plan.md
 * -----------------------------------------------------------------------------
 * Tynd memoisering oven på `runProjection(...)`. Cachen er OPT-IN: den aktiveres
 * kun når en call-site eksplicit bruger `runProjectionCached(...)` eller når
 * et profiler-måling viser >50ms pr. build (jf. planen).
 *
 * Designnoter:
 *  - LRU er implementeret med insertion-order af `Map`. Get → re-insert for
 *    at flytte til "most recently used". O(1) pr. operation.
 *  - Cache-nøgle hashes deterministisk ud fra de relevante input-felter.
 *    `Set` og `Map` serialiseres som sorterede arrays for stabil hash.
 *  - Invalidering sker ved at kalde `projectionCache.invalidate({ businessId })`
 *    fra mutation-handlers (agreements/exceptions/holidays) — eller `.clear()`
 *    ved cross-business handlinger som plan-swap.
 */

import { runProjection, type ProjectionInput, type ProjectionResult } from "./index";

const DEFAULT_CAPACITY = 64;

export type ProjectionCacheKeyParts = {
  businessId: string;
  rangeStart: string;
  rangeEnd: string;
  /** Hash af alle øvrige input-felter — sources, overrides, pauses, exceptions, holidays, realStops. */
  inputHash: string;
};

const stableStringify = (value: unknown): string => {
  if (value === null || value === undefined) return String(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value instanceof Set) return `S[${[...value].map(String).sort().join(",")}]`;
  if (value instanceof Map) {
    const entries = [...value.entries()]
      .map(([k, v]) => `${String(k)}=${stableStringify(v)}`)
      .sort();
    return `M{${entries.join(",")}}`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys.map((k) => `${k}:${stableStringify((value as any)[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

/** Bygger en stabil, deterministisk cache-nøgle for et `ProjectionInput`. */
export const hashProjectionInput = (input: ProjectionInput): string => {
  return stableStringify({
    sources: input.sources,
    rangeStart: input.rangeStart,
    rangeEnd: input.rangeEnd,
    realRouteDates: input.realRouteDates,
    realStops: input.realStops,
    realRouteDateById: input.realRouteDateById,
    overrides: input.overrides,
    pauses: input.pauses,
    holidayDates: input.holidayDates ? [...input.holidayDates] : undefined,
    exceptions: input.exceptions,
  });
};

type Entry = { value: ProjectionResult; businessId: string; hits: number };

export class ProjectionCache {
  private readonly store = new Map<string, Entry>();
  private stats = { hits: 0, misses: 0, evictions: 0 };

  constructor(private readonly capacity: number = DEFAULT_CAPACITY) {}

  get(key: ProjectionCacheKeyParts): ProjectionResult | undefined {
    const fullKey = this.compose(key);
    const entry = this.store.get(fullKey);
    if (!entry) {
      this.stats.misses += 1;
      return undefined;
    }
    // Re-insert → mark as most recently used.
    this.store.delete(fullKey);
    this.store.set(fullKey, entry);
    entry.hits += 1;
    this.stats.hits += 1;
    return entry.value;
  }

  set(key: ProjectionCacheKeyParts, value: ProjectionResult): void {
    const fullKey = this.compose(key);
    if (this.store.has(fullKey)) {
      this.store.delete(fullKey);
    } else if (this.store.size >= this.capacity) {
      // Evict least-recently-used (first entry in insertion order).
      const oldest = this.store.keys().next().value as string | undefined;
      if (oldest) {
        this.store.delete(oldest);
        this.stats.evictions += 1;
      }
    }
    this.store.set(fullKey, { value, businessId: key.businessId, hits: 0 });
  }

  /** Fjern alle entries — fx ved plan-/business-skift. */
  clear(): void {
    this.store.clear();
  }

  /** Fjern alle entries der hører til en bestemt business. */
  invalidate(filter: { businessId: string }): void {
    for (const [k, v] of this.store) {
      if (v.businessId === filter.businessId) this.store.delete(k);
    }
  }

  get size(): number { return this.store.size; }
  getStats() { return { ...this.stats, size: this.store.size }; }
  resetStats(): void { this.stats = { hits: 0, misses: 0, evictions: 0 }; }

  private compose(k: ProjectionCacheKeyParts): string {
    return `${k.businessId}|${k.rangeStart}|${k.rangeEnd}|${k.inputHash}`;
  }
}

/** Modul-global default-instans. Holdes lille (64) så hukommelses-footprint er minimalt. */
export const projectionCache = new ProjectionCache(DEFAULT_CAPACITY);

/**
 * `runProjection(...)` med transparent LRU-cache. Identisk signatur og return —
 * call-sites kan swap-in uden andre ændringer. `businessId` skal sendes ind,
 * fordi `ProjectionInput` ikke selv kender det.
 */
export const runProjectionCached = (
  input: ProjectionInput,
  ctx: { businessId: string; cache?: ProjectionCache } = { businessId: "_anon" },
): ProjectionResult => {
  const cache = ctx.cache ?? projectionCache;
  const key: ProjectionCacheKeyParts = {
    businessId: ctx.businessId,
    rangeStart: input.rangeStart,
    rangeEnd: input.rangeEnd,
    inputHash: hashProjectionInput(input),
  };
  const hit = cache.get(key);
  if (hit) return hit;
  const result = runProjection(input);
  cache.set(key, result);
  return result;
};
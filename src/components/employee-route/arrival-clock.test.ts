import { beforeEach, describe, expect, it, vi } from "vitest";
import { readArrival, saveArrival, readArrivalEstimate, saveArrivalEstimate } from "./route-run-clock";

describe("shared guide and checklist arrival", () => {
  beforeEach(() => {
    const items = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (k: string) => items.get(k) ?? null, setItem: (k: string, v: string) => items.set(k, v) });
  });
  it("keeps the exact registered arrival for the same stop", () => {
    const now = Date.now();
    saveArrival("actual", "one", now);
    expect(readArrival("actual", "one")).toBe(now);
    expect(readArrival("actual", "two")).toBeNull();
  });
  it("preserves the estimate during a view switch, not scheduled time", () => {
    saveArrivalEstimate("switch", "one", 300_000, 100_000);
    expect(readArrivalEstimate("switch", "one", 101_000)).toBe(300_000);
    expect(readArrivalEstimate("switch", "two", 101_000)).toBeNull();
  });
  it("expires old estimates and rejects future-clock data", () => {
    saveArrivalEstimate("expiry", "one", 300_000, 100_000);
    expect(readArrivalEstimate("expiry", "one", 701_000)).toBeNull();
    expect(readArrivalEstimate("expiry", "one", 90_000)).toBeNull();
  });
});
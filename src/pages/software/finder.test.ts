import { describe, expect, it } from "vitest";
import { finderResult } from "./finder";

describe("rutesystem-finder", () => {
  it("MobilePay tæller som opfyldt via regnskabsprogrammet", () => {
    const r = finderResult({ work: "routes", team: "small", needs: ["mobilepay", "app"], current: "none" });
    expect(r.gaps.some((g) => g.includes("MobilePay"))).toBe(false);
    expect(r.matched.some((m) => m.includes("MobilePay"))).toBe(true);
    expect(r.matched.some((m) => m.includes("Medarbejder-app"))).toBe(true);
  });
  it("viser SkvizBiz' styrker når brugeren kommer derfra", () => {
    const r = finderResult({ work: "routes", team: "solo", needs: [], current: "skvizbiz" });
    expect(r.from?.name).toBe("SkvizBiz");
  });
});

import { describe, expect, it } from "vitest";
import { detectInstallPlatform, installOptionOrder, isAppInstalled } from "./app-install";

describe("app-install", () => {
  it("genkender Android-telefoner", () => {
    expect(detectInstallPlatform({ userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8)" })).toBe("android");
  });
  it("genkender iPhone og iPad med desktop-UA", () => {
    expect(detectInstallPlatform({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)" })).toBe("ios");
    expect(detectInstallPlatform({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", maxTouchPoints: 5 })).toBe("ios");
  });
  it("behandler almindelig computer som desktop", () => {
    expect(detectInstallPlatform({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", maxTouchPoints: 0 })).toBe("desktop");
  });
  it("skjuler tilbuddet, når appen allerede er installeret", () => {
    expect(isAppInstalled({ userAgent: "", native: true })).toBe(true);
    expect(isAppInstalled({ userAgent: "", standalone: true })).toBe(true);
    expect(isAppInstalled({ userAgent: "" })).toBe(false);
  });
  it("viser Apple først på iPhone, ellers Android først", () => {
    expect(installOptionOrder("ios")).toEqual(["ios", "android"]);
    expect(installOptionOrder("android")).toEqual(["android", "ios"]);
    expect(installOptionOrder("desktop")).toEqual(["android", "ios"]);
  });
});

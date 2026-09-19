import { describe, it, expect, beforeEach } from "vitest";
import { readRunMode, writeRunMode, clearRunMode } from "./RouteRunMode";

describe("RouteRunMode", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("husker intet valg som udgangspunkt", () => {
    expect(readRunMode()).toBeNull();
  });

  it("gemmer valget når medarbejderen beder om det", () => {
    writeRunMode("list", true);
    expect(readRunMode()).toBe("list");
    writeRunMode("guide", true);
    expect(readRunMode()).toBe("guide");
  });

  it("gemmer ikke valget når 'husk mit valg' er slået fra", () => {
    writeRunMode("list", false);
    expect(readRunMode()).toBeNull();
  });

  it("kan nulstilles", () => {
    writeRunMode("guide", true);
    clearRunMode();
    expect(readRunMode()).toBeNull();
  });

  it("ignorerer ugyldige værdier i storage", () => {
    window.localStorage.setItem("serviceydere:employee-route:run-mode", "kaos");
    expect(readRunMode()).toBeNull();
  });
});

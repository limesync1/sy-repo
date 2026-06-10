import { describe, it, expect } from "vitest";
import { canCompleteEarly, earlyCompletionReason } from "./early-completion";

describe("canCompleteEarly", () => {
  it("route-level allow wins over everything", () => {
    expect(canCompleteEarly({ routeAllow: true, employeeMode: "never", businessDefault: false })).toBe(true);
  });

  it("employee 'always' allows when route is null", () => {
    expect(canCompleteEarly({ routeAllow: null, employeeMode: "always", businessDefault: false })).toBe(true);
  });

  it("employee 'never' blocks even when business default is true", () => {
    expect(canCompleteEarly({ routeAllow: null, employeeMode: "never", businessDefault: true })).toBe(false);
  });

  it("inherit + business true → allowed", () => {
    expect(canCompleteEarly({ routeAllow: null, employeeMode: "inherit", businessDefault: true })).toBe(true);
  });

  it("inherit + business false → denied", () => {
    expect(canCompleteEarly({ routeAllow: null, employeeMode: "inherit", businessDefault: false })).toBe(false);
  });

  it("inherit + business null → denied", () => {
    expect(canCompleteEarly({ routeAllow: null, employeeMode: "inherit", businessDefault: null })).toBe(false);
  });

  it("default mode (undefined) behaves as inherit", () => {
    expect(canCompleteEarly({ businessDefault: true })).toBe(true);
    expect(canCompleteEarly({ businessDefault: false })).toBe(false);
  });
});

describe("earlyCompletionReason", () => {
  it("returns route-specific reason when route allows", () => {
    expect(earlyCompletionReason({ routeAllow: true })).toMatch(/specifikt låst op/);
  });
  it("returns employee 'never' reason", () => {
    expect(earlyCompletionReason({ employeeMode: "never" })).toMatch(/tillader ikke tidlig udførelse/);
  });
  it("returns business default reason", () => {
    expect(earlyCompletionReason({ businessDefault: true })).toMatch(/Virksomheden tillader/);
  });
  it("returns locked-by-default reason", () => {
    expect(earlyCompletionReason({})).toMatch(/først udføres når dagen er aktuel/);
  });
});
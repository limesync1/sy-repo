import { describe, it, expect, beforeEach } from "vitest";
import { readNativeRole, saveNativeRole, loginPathFor } from "./native-role";

describe("native role choice", () => {
  beforeEach(() => localStorage.clear());
  it("remembers the chosen role", () => {
    saveNativeRole("owner");
    expect(readNativeRole()).toBe("owner");
  });
  it("forgets the role when switching", () => {
    saveNativeRole("employee");
    saveNativeRole(null);
    expect(readNativeRole()).toBeNull();
  });
  it("sends owners and employees to their own login", () => {
    expect(loginPathFor("owner")).toContain("mode=business");
    expect(loginPathFor("employee")).toContain("mode=employee");
    expect(loginPathFor("customer")).toContain("mode=customer");
  });
  it("remembers customers too", () => {
    saveNativeRole("customer");
    expect(readNativeRole()).toBe("customer");
  });
});

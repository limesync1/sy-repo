import { describe, expect, it } from "vitest";
import { initialSettingsSection } from "./settings-section";

describe("settings topic selection", () => {
  it("opens a linked topic instead of a remembered topic", () => {
    expect(initialSettingsSection("#settings-billing", "hours")).toBe("billing");
  });
  it("restores the remembered topic without a settings link", () => {
    expect(initialSettingsSection("", "hours")).toBe("hours");
  });
  it("keeps contact within the company topic", () => {
    expect(initialSettingsSection("#settings-contact", "hours")).toBe("general");
  });
  it("opens the company topic when no selection is available", () => {
    expect(initialSettingsSection("", null)).toBe("general");
  });
});
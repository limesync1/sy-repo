import { afterEach, expect, it, vi } from "vitest";
import { consumePanelNavigation } from "./navigation-storage";

afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear(); });
it("consumes the internal navigation hint only once", () => {
  sessionStorage.setItem("sy.panel.navigation", "1");
  expect(consumePanelNavigation()).toBe(true);
  expect(consumePanelNavigation()).toBe(false);
});
it("keeps loading available when reading browser storage is blocked", () => {
  vi.stubGlobal("sessionStorage", { getItem: () => { throw new Error("Blocked"); } });
  expect(consumePanelNavigation()).toBe(false);
});
it("keeps loading available when clearing browser storage is blocked", () => {
  vi.stubGlobal("sessionStorage", { getItem: () => "1", removeItem: () => { throw new Error("Blocked"); } });
  expect(consumePanelNavigation()).toBe(false);
});
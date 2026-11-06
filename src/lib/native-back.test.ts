import { describe, it, expect } from "vitest";
import { backButtonAction } from "./native-back";

describe("Android back button", () => {
  it("closes an open window first", () => {
    expect(backButtonAction({ dialogOpen: true, pathname: "/app", canGoBack: true })).toBe("close-dialog");
  });
  it("exits from the role choice page", () => {
    expect(backButtonAction({ dialogOpen: false, pathname: "/app", canGoBack: true })).toBe("exit");
  });
  it("goes one step back elsewhere", () => {
    expect(backButtonAction({ dialogOpen: false, pathname: "/virksomhed", canGoBack: true })).toBe("back");
  });
  it("exits when there is no history", () => {
    expect(backButtonAction({ dialogOpen: false, pathname: "/virksomhed", canGoBack: false })).toBe("exit");
  });
});

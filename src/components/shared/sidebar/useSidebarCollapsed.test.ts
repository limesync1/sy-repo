// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { readSidebarCollapsed, useSidebarCollapsed } from "./useSidebarCollapsed";

const KEY = "sy.test.collapsed";

describe("useSidebarCollapsed", () => {
  beforeEach(() => window.localStorage.clear());

  it("falls back to the default when nothing is stored", () => {
    expect(readSidebarCollapsed(KEY)).toBe(false);
    expect(readSidebarCollapsed(KEY, true)).toBe(true);
  });

  it("persists toggles", () => {
    const { result } = renderHook(() => useSidebarCollapsed(KEY));
    act(() => result.current.toggle());
    expect(result.current.collapsed).toBe(true);
    expect(window.localStorage.getItem(KEY)).toBe("1");
  });

  it("toggles on '[' but ignores it while typing in an input", () => {
    const { result } = renderHook(() => useSidebarCollapsed(KEY));
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "[" })); });
    expect(result.current.collapsed).toBe(true);

    const input = document.createElement("input");
    document.body.appendChild(input);
    act(() => { input.dispatchEvent(new KeyboardEvent("keydown", { key: "[", bubbles: true })); });
    expect(result.current.collapsed).toBe(true);
    input.remove();
  });

  it("follows changes from another tab", () => {
    const { result } = renderHook(() => useSidebarCollapsed(KEY));
    act(() => { window.dispatchEvent(new StorageEvent("storage", { key: KEY, newValue: "1" })); });
    expect(result.current.collapsed).toBe(true);
  });
});

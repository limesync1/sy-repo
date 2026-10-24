import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import DeferredSection from "./DeferredSection";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("mounts a section only when near view and retains it after leaving", () => {
  let notify: (entries: { isIntersecting: boolean }[]) => void = () => {};
  const mount = vi.fn();
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: typeof notify) { notify = callback; }
    observe() {} disconnect() {}
  });
  function Content() { mount(); return <span>Ready</span>; }
  render(<DeferredSection fallback={<span>Pending</span>}><Content /></DeferredSection>);
  expect(mount).not.toHaveBeenCalled();
  act(() => notify([{ isIntersecting: true }]));
  expect(mount).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Ready")).toBeTruthy();
  act(() => notify([{ isIntersecting: false }]));
  expect(screen.queryByText("Pending")).toBeNull();
});
it("preloads without mounting distant content, then mounts only when near", async () => {
  const callbacks: ((entries: { isIntersecting: boolean }[]) => void)[] = [];
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: typeof callbacks[number]) { callbacks.push(callback); }
    observe() {} disconnect() {}
  });
  const preload = vi.fn().mockResolvedValue({});
  const mount = vi.fn();
  function Content() { mount(); return <span>Content</span>; }
  render(<DeferredSection preload={preload} fallback={<span>Pending</span>}><Content /></DeferredSection>);
  await act(async () => callbacks[0]([{ isIntersecting: true }]));
  expect(preload).toHaveBeenCalledTimes(1);
  expect(mount).not.toHaveBeenCalled();
  act(() => callbacks[1]([{ isIntersecting: true }]));
  expect(mount).toHaveBeenCalledTimes(1);
});
it("does not leave content stuck loading without IntersectionObserver", () => {
  vi.stubGlobal("IntersectionObserver", undefined);
  render(<DeferredSection fallback={<span>Pending</span>}><span>Content</span></DeferredSection>);
  expect(screen.getByText("Content")).toBeTruthy();
  expect(screen.queryByText("Pending")).toBeNull();
});
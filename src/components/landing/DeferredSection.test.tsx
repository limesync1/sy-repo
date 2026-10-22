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
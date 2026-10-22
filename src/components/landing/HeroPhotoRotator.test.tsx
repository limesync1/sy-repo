import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HeroPhotoRotator from "./HeroPhotoRotator";

vi.mock("./hero-photos", () => ({ HERO_PHOTO_SIZES: "100vw", photoSrcSet: (photo: { src: string }) => `${photo.src} 1280w`, heroPhotos: [
  { src: "/first.webp", alt: "First", width: 1280, height: 956 },
  { src: "/second.webp", alt: "Second", width: 1280, height: 956 },
] }));

describe("hero background scheduling", () => {
  let intersect: (entries: { isIntersecting: boolean }[]) => void;
  let reduced = false;
  beforeEach(() => {
    vi.useFakeTimers();
    reduced = false;
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: typeof intersect) { intersect = callback; }
      observe() {} disconnect() {}
    });
    vi.spyOn(window, "matchMedia").mockImplementation(() => ({
      matches: reduced, addEventListener() {}, removeEventListener() {},
    } as unknown as MediaQueryList));
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it("does not poll or preload when offscreen", () => {
    render(<HeroPhotoRotator />);
    expect(vi.getTimerCount()).toBe(0);
    act(() => intersect([{ isIntersecting: true }]));
    expect(vi.getTimerCount()).toBe(2);
    act(() => intersect([{ isIntersecting: false }]));
    expect(vi.getTimerCount()).toBe(0);
  });
  it("does not schedule animation when reduced motion is requested", () => {
    reduced = true;
    render(<HeroPhotoRotator />);
    act(() => intersect([{ isIntersecting: true }]));
    expect(vi.getTimerCount()).toBe(0);
  });
  it("cancels pending work when the browser tab is hidden", () => {
    render(<HeroPhotoRotator />);
    act(() => intersect([{ isIntersecting: true }]));
    expect(vi.getTimerCount()).toBe(2);
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(vi.getTimerCount()).toBe(0);
  });
});
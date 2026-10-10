import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useGpsFilter } from "./useGpsFilter";

describe("fresh driving fixes", () => {
  const fix = { lat: 56, lng: 9, accuracy: 10, heading: 0, speed: 15, t: 1000 };
  it("uses accurate stopped speed immediately instead of waiting for three fixes", () => {
    const { result, rerender } = renderHook(({ raw }) => useGpsFilter(raw), { initialProps: { raw: fix } });
    act(() => rerender({ raw: { ...fix, speed: 0, t: 2000 } }));
    expect(result.current?.speedMps).toBe(0);
  });
  it("resumes at the fresh position after a background gap without replaying old positions", () => {
    const { result, rerender } = renderHook(({ raw }) => useGpsFilter(raw), { initialProps: { raw: fix } });
    act(() => rerender({ raw: { ...fix, lat: 56.1, lng: 9.1, t: 15000 } }));
    expect(result.current?.pos).toEqual([56.1, 9.1]);
  });
});
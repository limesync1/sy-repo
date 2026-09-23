import { describe, expect, it } from "vitest";
import { isBusyStopLoad, isOverloadedStopLoad, stopCapacity } from "./stop-capacity";

describe("stopCapacity", () => {
  it("uses eight stops per active employee", () => {
    expect(stopCapacity(7, 1)).toEqual({ stops_booked: 7, stops_capacity: 8, load_pct: 88 });
    expect(stopCapacity(9, 2)).toEqual({ stops_booked: 9, stops_capacity: 16, load_pct: 56 });
  });
  it("distinguishes a full day from an overloaded day", () => {
    expect(isBusyStopLoad(stopCapacity(8, 1))).toBe(true);
    expect(isOverloadedStopLoad(stopCapacity(8, 1))).toBe(false);
    expect(isOverloadedStopLoad(stopCapacity(9, 1))).toBe(true);
  });
  it("never creates zero capacity", () => expect(stopCapacity(1, 0).stops_capacity).toBe(8));
});

import { describe, it, expect } from "vitest";
import { isSelectableTargetRoute, todayInDenmark } from "./selectable-routes";

const today = "2026-10-25";

describe("isSelectableTargetRoute", () => {
  it("rejects routes before today", () => {
    expect(isSelectableTargetRoute({ route_date: "2026-10-24" }, [], today)).toBe(false);
  });
  it("accepts today's route", () => {
    expect(isSelectableTargetRoute({ route_date: "2026-10-25" }, [{ status: "planned" }], today)).toBe(true);
  });
  it("rejects archived routes", () => {
    expect(isSelectableTargetRoute({ route_date: "2026-11-01", archived_at: "x" }, [], today)).toBe(false);
  });
  it("rejects projected routes", () => {
    expect(isSelectableTargetRoute({ route_date: "2026-11-01", isVirtual: true }, [], today)).toBe(false);
  });
  it("rejects fully completed routes", () => {
    expect(isSelectableTargetRoute({ route_date: "2026-11-01" }, [{ status: "completed" }], today)).toBe(false);
  });
  it("uses Danish date across midnight UTC", () => {
    expect(todayInDenmark(new Date("2026-10-25T23:30:00Z"))).toBe("2026-10-26");
  });
});

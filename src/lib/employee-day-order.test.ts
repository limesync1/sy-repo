import { describe, expect, it } from "vitest";
import { orderDayRoutes } from "./employee-day-order";

describe("employee route order", () => {
  it("uses start time instead of creation order without mutating input", () => {
    const routes = [{ id: "late", planned_start_time: "12:00:00", created_at: "1" }, { id: "early", planned_start_time: "08:00", created_at: "2" }];
    expect(orderDayRoutes(routes).map(r => r.id)).toEqual(["early", "late"]);
    expect(routes[0].id).toBe("late");
  });
  it("puts untimed routes last with stable ties", () => {
    expect(orderDayRoutes([{ id: "b" }, { id: "a" }, { id: "timed", planned_start_time: "09:00" }]).map(r => r.id)).toEqual(["timed", "a", "b"]);
  });
  it("normalizes seconds and keeps equal starts stable", () => {
    expect(orderDayRoutes([{ id: "new", planned_start_time: "08:00", created_at: "2" }, { id: "old", planned_start_time: "08:00:00", created_at: "1" }]).map(r => r.id)).toEqual(["old", "new"]);
  });
});
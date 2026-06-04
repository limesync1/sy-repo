/**
 * Tests for the pure helpers in useRoutePlannerSimulation (Bølge 5.1).
 * Hooken selv testes ikke her — kun mappers, hvilket er hvor regressioner
 * gør mest skade.
 */
import { describe, it, expect } from "vitest";
import {
  HHMM, addMinutes, buildPlanStops, mapDragToAction,
} from "./useRoutePlannerSimulation";

describe("HHMM", () => {
  it("normaliserer HH:mm:ss til HH:mm", () => {
    expect(HHMM("09:30:15")).toBe("09:30");
  });
  it("returnerer null for tom værdi", () => {
    expect(HHMM(null)).toBeNull();
    expect(HHMM(undefined)).toBeNull();
    expect(HHMM("")).toBeNull();
  });
  it("parser ISO-timestamp", () => {
    const iso = "2026-05-25T08:05:00Z";
    const v = HHMM(iso);
    expect(v).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe("addMinutes", () => {
  it("lægger minutter til", () => {
    expect(addMinutes("09:00", 45)).toBe("09:45");
    expect(addMinutes("09:30", 90)).toBe("11:00");
  });
  it("wrapper ved døgnskifte", () => {
    expect(addMinutes("23:30", 60)).toBe("00:30");
  });
  it("returnerer null for ugyldigt input", () => {
    expect(addMinutes(null, 30)).toBeNull();
    expect(addMinutes("abc", 30)).toBeNull();
  });
});

describe("buildPlanStops", () => {
  it("mapper rå stops til Plan-stops med rute-dato fallback", () => {
    const routes = [{ id: "r1", route_date: "2026-05-25" }];
    const stops = [
      {
        id: "s1", route_id: "r1",
        planned_arrival: "09:00", planned_departure: "10:00",
        assigned_employee_id: "e1",
        customer_name: "Kunde A",
      },
    ];
    const out = buildPlanStops(stops, routes);
    expect(out).toEqual([{
      id: "s1", route_id: "r1", route_date: "2026-05-25",
      employee_ids: ["e1"], start_time: "09:00", end_time: "10:00",
      label: "Kunde A",
    }]);
  });

  it("foretrækker assignee_ids over assigned_employee_id", () => {
    const out = buildPlanStops(
      [{ id: "s1", route_id: "r1", assignee_ids: ["a", "b"], assigned_employee_id: "z" }],
      [{ id: "r1", route_date: "2026-05-25" }],
    );
    expect(out[0].employee_ids).toEqual(["a", "b"]);
  });

  it("udleder end_time fra duration_minutes hvis kun start findes", () => {
    const out = buildPlanStops(
      [{ id: "s1", route_id: "r1", planned_arrival: "08:00", duration_minutes: 45 }],
      [{ id: "r1", route_date: "2026-05-25" }],
    );
    expect(out[0].start_time).toBe("08:00");
    expect(out[0].end_time).toBe("08:45");
  });

  it("håndterer tom input", () => {
    expect(buildPlanStops([], [])).toEqual([]);
  });
});

describe("mapDragToAction", () => {
  const routes = [{ id: "r1", route_date: "2026-05-25" }];

  it("returnerer null uden data eller target", () => {
    expect(mapDragToAction(null, "day:2026-05-25", routes)).toBeNull();
    expect(mapDragToAction({ type: "stop" }, null, routes)).toBeNull();
  });

  it("stop → day giver MOVE_STOP med target-dato", () => {
    const a = mapDragToAction(
      { type: "stop", stop: { id: "s1", assigned_employee_id: "e1" } },
      "day:2026-05-26", routes,
    );
    expect(a).toEqual({ type: "MOVE_STOP", stopId: "s1", toEmployeeId: "e1", toDate: "2026-05-26" });
  });

  it("stop → route bruger rutens dato", () => {
    const a = mapDragToAction(
      { type: "stop", stop: { id: "s1", assignee_ids: ["e9"] } },
      "route:r1", routes,
    );
    expect(a).toEqual({ type: "MOVE_STOP", stopId: "s1", toEmployeeId: "e9", toDate: "2026-05-25" });
  });

  it("stop → ukendt route → null", () => {
    const a = mapDragToAction(
      { type: "stop", stop: { id: "s1" } },
      "route:does-not-exist", routes,
    );
    expect(a).toBeNull();
  });

  it("route → day giver MOVE_ROUTE", () => {
    const a = mapDragToAction(
      { type: "route", route: { id: "r1" } },
      "day:2026-05-27", routes,
    );
    expect(a).toEqual({ type: "MOVE_ROUTE", routeId: "r1", toDate: "2026-05-27" });
  });

  it("job-type ignoreres (eksisterer ikke i planen)", () => {
    const a = mapDragToAction(
      { type: "job", job: { id: "j1" } },
      "day:2026-05-25", routes,
    );
    expect(a).toBeNull();
  });
});
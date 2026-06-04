import { describe, it, expect } from "vitest";
import { simulate } from "./simulation";
import type { Plan } from "./conflict-engine";

const stop = (id: string, opts: Partial<any> = {}) => ({
  id,
  route_id: "r1",
  route_date: "2026-06-04",
  start_time: "08:00",
  end_time: "09:00",
  employee_ids: [],
  ...opts,
});

const plan = (): Plan => ({
  stops: [stop("s1", { employee_ids: ["e1"] }), stop("s2", { employee_ids: [] })],
  employees: [{ id: "e1" }, { id: "e2" }],
});

describe("simulate", () => {
  it("MOVE_STOP ændrer assignee og logger change", () => {
    const r = simulate(plan(), { type: "MOVE_STOP", stopId: "s2", toEmployeeId: "e2" });
    expect(r.changes).toHaveLength(1);
    expect(r.changes[0].after.employeeIds).toEqual(["e2"]);
    expect(r.diffCount).toBe(1);
  });

  it("CANCEL_STOP fjerner stoppet", () => {
    const r = simulate(plan(), { type: "CANCEL_STOP", stopId: "s1" });
    expect(r.plan.stops.map((s) => s.id)).toEqual(["s2"]);
  });

  it("detekterer overlap-konflikt efter REASSIGN", () => {
    const p: Plan = {
      stops: [
        stop("s1", { employee_ids: ["e1"] }),
        stop("s2", { employee_ids: ["e2"], start_time: "08:30", end_time: "09:30" }),
      ],
      employees: [{ id: "e1" }, { id: "e2" }],
    };
    const r = simulate(p, { type: "REASSIGN", stopId: "s2", employeeIds: ["e1"] });
    expect(r.conflicts.some((c) => c.code === "time_overlap")).toBe(true);
  });

  it("kæder flere actions", () => {
    const r = simulate(plan(), [
      { type: "MOVE_STOP", stopId: "s2", toEmployeeId: "e2" },
      { type: "CANCEL_STOP", stopId: "s1" },
    ]);
    expect(r.diffCount).toBe(2);
    expect(r.plan.stops).toHaveLength(1);
  });

  it("muterer ikke input-planen", () => {
    const p = plan();
    simulate(p, { type: "MOVE_STOP", stopId: "s1", toEmployeeId: "e2" });
    expect(p.stops[0].employee_ids).toEqual(["e1"]);
  });
});
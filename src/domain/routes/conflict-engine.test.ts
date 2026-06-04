import { describe, it, expect } from "vitest";
import { evaluateConflicts, type Plan } from "./conflict-engine";

const stop = (over: Partial<Plan["stops"][number]> = {}): Plan["stops"][number] => ({
  id: "s1",
  route_id: "r1",
  route_date: "2026-06-01",
  employee_ids: ["e1"],
  ...over,
});

describe("ConflictEngine.evaluateConflicts", () => {
  it("flagger time-overlap som error", () => {
    const out = evaluateConflicts({
      stops: [
        stop({ id: "a", start_time: "08:00", end_time: "10:00" }),
        stop({ id: "b", start_time: "09:00", end_time: "11:00" }),
      ],
    });
    const c = out.find((x) => x.code === "time_overlap");
    expect(c?.severity).toBe("error");
    expect(c?.stopIds.sort()).toEqual(["a", "b"]);
  });

  it("flagger same-day uden overlap som warning (double_booking)", () => {
    const out = evaluateConflicts({
      stops: [
        stop({ id: "a", start_time: "08:00", end_time: "09:00" }),
        stop({ id: "b", start_time: "10:00", end_time: "11:00" }),
      ],
    });
    expect(out.some((x) => x.code === "double_booking" && x.severity === "warning")).toBe(true);
  });

  it("opdager skill mismatch", () => {
    const out = evaluateConflicts({
      stops: [stop({ requiredSkills: ["vinduespudser"] })],
      employees: [{ id: "e1", skills: ["rengøring"] }],
    });
    expect(out[0]).toMatchObject({ code: "skill_mismatch", severity: "error" });
    expect(out[0].meta).toMatchObject({ missing: ["vinduespudser"] });
  });

  it("opdager arbejde uden for arbejdstid", () => {
    const out = evaluateConflicts({
      stops: [stop({ start_time: "06:00", end_time: "07:00" })],
      employees: [{ id: "e1", workingHoursStart: "08:00", workingHoursEnd: "16:00" }],
    });
    expect(out[0].code).toBe("outside_working_hours");
  });

  it("opdager ferie-konflikt", () => {
    const out = evaluateConflicts({
      stops: [stop()],
      employees: [{ id: "e1", holidayDates: ["2026-06-01"] }],
    });
    expect(out[0]).toMatchObject({ code: "employee_on_holiday", severity: "error" });
  });

  it("opdager kapacitets-overskridelse", () => {
    const out = evaluateConflicts({
      stops: [
        stop({ id: "a" }),
        stop({ id: "b" }),
        stop({ id: "c" }),
      ],
      employees: [{ id: "e1", dailyCapacity: 2 }],
    });
    const c = out.find((x) => x.code === "over_capacity");
    expect(c).toBeTruthy();
    expect(c?.meta).toMatchObject({ count: 3, capacity: 2 });
  });

  it("opdager geo-afstand over max", () => {
    const out = evaluateConflicts({
      stops: [stop({ distanceKm: 250 })],
      maxGeoKm: 100,
    });
    expect(out.find((x) => x.code === "geo_too_far")?.severity).toBe("info");
  });

  it("opdager kunde-præference mismatch", () => {
    const out = evaluateConflicts({
      stops: [stop({ preferredEmployeeId: "e2" })],
    });
    expect(out[0].code).toBe("customer_preference_mismatch");
  });

  it("only-filter begrænser regler", () => {
    const out = evaluateConflicts(
      {
        stops: [
          stop({ id: "a", start_time: "08:00", end_time: "10:00" }),
          stop({ id: "b", start_time: "09:00", end_time: "11:00" }),
        ],
        employees: [{ id: "e1", holidayDates: ["2026-06-01"] }],
      },
      { only: ["employee_on_holiday"] },
    );
    expect(out.every((x) => x.code === "employee_on_holiday")).toBe(true);
  });
});
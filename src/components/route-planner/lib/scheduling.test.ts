import { describe, it, expect } from "vitest";
import {
  hhmmToMin,
  isoToMin,
  snapMinutes,
  minToIso,
  minToHHmm,
  findFirstFreeSlot,
  busyIntervalsForEmployee,
  SLOT_MIN,
} from "./scheduling";
import type { RouteStop } from "@/hooks/useRoutes";

const stop = (over: Partial<RouteStop>): RouteStop =>
  ({
    id: "s",
    route_id: "r",
    sequence: 0,
    customer_name: null,
    address: null,
    latitude: null,
    longitude: null,
    duration_minutes: 30,
    planned_arrival: null,
    planned_departure: null,
    assigned_employee_id: null,
    assignee_ids: [],
    ...over,
  } as unknown as RouteStop);

describe("hhmmToMin", () => {
  it("parses HH:mm", () => {
    expect(hhmmToMin("08:30")).toBe(510);
    expect(hhmmToMin("00:00")).toBe(0);
    expect(hhmmToMin("23:45")).toBe(23 * 60 + 45);
  });
  it("returns null for invalid input", () => {
    expect(hhmmToMin(null)).toBeNull();
    expect(hhmmToMin(undefined)).toBeNull();
    expect(hhmmToMin("")).toBeNull();
    expect(hhmmToMin("abc")).toBeNull();
  });
  it("accepts HH:mm:ss prefix", () => {
    expect(hhmmToMin("09:15:30")).toBe(9 * 60 + 15);
  });
});

describe("snapMinutes", () => {
  it("snaps to nearest 15-min slot by default", () => {
    expect(snapMinutes(0)).toBe(0);
    expect(snapMinutes(7)).toBe(0);
    expect(snapMinutes(8)).toBe(15);
    expect(snapMinutes(22)).toBe(15);
    expect(snapMinutes(23)).toBe(30);
    expect(snapMinutes(510)).toBe(510);
  });
  it("respects custom step", () => {
    expect(snapMinutes(13, 5)).toBe(15);
    expect(snapMinutes(31, 30)).toBe(30);
  });
});

describe("minToHHmm / minToIso roundtrip", () => {
  it("formats HH:mm zero-padded", () => {
    expect(minToHHmm(0)).toBe("00:00");
    expect(minToHHmm(9 * 60 + 5)).toBe("09:05");
    expect(minToHHmm(23 * 60 + 59)).toBe("23:59");
  });
  it("isoToMin parses what minToIso writes", () => {
    const iso = minToIso("2026-05-13", 8 * 60 + 30);
    expect(isoToMin(iso)).toBe(8 * 60 + 30);
  });
  it("isoToMin returns null for bad input", () => {
    expect(isoToMin(null)).toBeNull();
    expect(isoToMin("not-a-date")).toBeNull();
  });
});

describe("findFirstFreeSlot", () => {
  it("returns desired start (snapped) when no busy intervals", () => {
    expect(findFirstFreeSlot(8 * 60 + 7, 30, [])).toBe(8 * 60);
    expect(findFirstFreeSlot(8 * 60 + 8, 30, [])).toBe(8 * 60 + 15);
  });

  it("skips past a clashing interval", () => {
    const busy = [{ start: 8 * 60, end: 9 * 60 }];
    // desired 8:00 with 30 min duration overlaps -> next slot at 9:00
    expect(findFirstFreeSlot(8 * 60, 30, busy)).toBe(9 * 60);
  });

  it("places stop in a gap when it fits", () => {
    const busy = [
      { start: 8 * 60, end: 9 * 60 },
      { start: 10 * 60, end: 11 * 60 },
    ];
    // 30 min from 9:00 fits before 10:00
    expect(findFirstFreeSlot(9 * 60, 30, busy)).toBe(9 * 60);
  });

  it("jumps over multiple consecutive busy blocks", () => {
    const busy = [
      { start: 8 * 60, end: 9 * 60 },
      { start: 9 * 60, end: 10 * 60 },
      { start: 10 * 60, end: 11 * 60 },
    ];
    expect(findFirstFreeSlot(8 * 60, 45, busy)).toBe(11 * 60);
  });

  it("treats touching intervals as non-overlapping (back-to-back stops allowed)", () => {
    const busy = [{ start: 9 * 60, end: 10 * 60 }];
    // 8:30 -> 9:00 ends exactly when busy starts: should be allowed
    expect(findFirstFreeSlot(8 * 60 + 30, 30, busy)).toBe(8 * 60 + 30);
  });

  it("uses minimum slot duration when duration < SLOT_MIN", () => {
    const busy = [{ start: 8 * 60, end: 8 * 60 + 10 }];
    // duration 5 should be treated as SLOT_MIN (15) so 8:00 still clashes
    expect(findFirstFreeSlot(8 * 60, 5, busy)).toBeGreaterThanOrEqual(8 * 60 + 15);
  });
});

describe("busyIntervalsForEmployee", () => {
  const stops: RouteStop[] = [
    stop({
      id: "a",
      assigned_employee_id: "e1",
      assignee_ids: ["e1"],
      planned_arrival: "2026-05-13T08:00:00",
      planned_departure: "2026-05-13T09:00:00",
      duration_minutes: 60,
    }),
    stop({
      id: "b",
      assigned_employee_id: "e2",
      assignee_ids: ["e2"],
      planned_arrival: "2026-05-13T10:00:00",
      planned_departure: "2026-05-13T10:30:00",
      duration_minutes: 30,
    }),
    stop({
      id: "c",
      assigned_employee_id: null,
      assignee_ids: ["e1", "e2"],
      planned_arrival: "2026-05-13T11:00:00",
      planned_departure: "2026-05-13T12:00:00",
      duration_minutes: 60,
    }),
  ];

  it("returns intervals only for the requested employee", () => {
    const e1 = busyIntervalsForEmployee(stops, "e1");
    expect(e1).toEqual([
      { start: 8 * 60, end: 9 * 60 },
      { start: 11 * 60, end: 12 * 60 },
    ]);
    const e2 = busyIntervalsForEmployee(stops, "e2");
    expect(e2).toEqual([
      { start: 10 * 60, end: 10 * 60 + 30 },
      { start: 11 * 60, end: 12 * 60 },
    ]);
  });

  it("excludes a given stop id (used during drag/optimize)", () => {
    const e1 = busyIntervalsForEmployee(stops, "e1", "a");
    expect(e1).toEqual([{ start: 11 * 60, end: 12 * 60 }]);
  });

  it("returns empty when no employee", () => {
    expect(busyIntervalsForEmployee(stops, null)).toEqual([]);
    expect(busyIntervalsForEmployee(stops, [])).toEqual([]);
  });

  it("falls back to start + duration when planned_departure is missing", () => {
    const noDep: RouteStop[] = [
      stop({
        id: "x",
        assigned_employee_id: "e1",
        assignee_ids: ["e1"],
        planned_arrival: "2026-05-13T08:00:00",
        planned_departure: null,
        duration_minutes: 45,
      }),
    ];
    expect(busyIntervalsForEmployee(noDep, "e1")).toEqual([
      { start: 8 * 60, end: 8 * 60 + 45 },
    ]);
  });

  it("supports array of employee ids (multi-assignee match)", () => {
    const matched = busyIntervalsForEmployee(stops, ["e2"]);
    expect(matched.length).toBe(2);
  });
});

describe("integration: place new stop on a busy day", () => {
  it("computes a non-conflicting start for a new 60-min job", () => {
    const dayStops: RouteStop[] = [
      stop({
        id: "a",
        assigned_employee_id: "e1",
        assignee_ids: ["e1"],
        planned_arrival: "2026-05-13T08:00:00",
        planned_departure: "2026-05-13T09:30:00",
        duration_minutes: 90,
      }),
      stop({
        id: "b",
        assigned_employee_id: "e1",
        assignee_ids: ["e1"],
        planned_arrival: "2026-05-13T10:00:00",
        planned_departure: "2026-05-13T11:00:00",
        duration_minutes: 60,
      }),
    ];
    const busy = busyIntervalsForEmployee(dayStops, "e1");
    // Desired 8:00 should be pushed past both jobs to 11:00
    const start = findFirstFreeSlot(8 * 60, 60, busy);
    expect(start).toBe(11 * 60);
    expect(SLOT_MIN).toBe(15);
  });
});
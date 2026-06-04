import { describe, expect, it } from "vitest";
import {
  classifyDrop,
  computeTargetDateForGuard,
  dropKeyFor,
  targetKeyFor,
} from "./drop-classifier";

describe("classifyDrop", () => {
  it("returns noop when either side mangler type", () => {
    expect(classifyDrop(null, null)).toBe("noop");
    expect(classifyDrop({ type: "job" }, null)).toBe("noop");
    expect(classifyDrop(null, { type: "day" })).toBe("noop");
  });

  it("klassificerer projicerede ruter særskilt", () => {
    expect(classifyDrop({ type: "route", route: { isVirtual: true } }, { type: "day" }))
      .toBe("projected-route-to-day");
    expect(classifyDrop({ type: "route", route: { isVirtual: true } }, { type: "route" }))
      .toBe("projected-route-to-route");
    // Virtuel rute droppet over ukendt type
    expect(classifyDrop({ type: "route", route: { isVirtual: true } }, { type: "stop" }))
      .toBe("noop");
  });

  it("klassificerer almindelige rute-drops", () => {
    expect(classifyDrop({ type: "route", route: {} }, { type: "route" })).toBe("route-to-route");
    expect(classifyDrop({ type: "route", route: {} }, { type: "day" })).toBe("route-to-day");
  });

  it("klassificerer job-drops", () => {
    expect(classifyDrop({ type: "job" }, { type: "route" })).toBe("job-to-route");
    expect(classifyDrop({ type: "job" }, { type: "day" })).toBe("job-to-day");
  });

  it("klassificerer stop-drops kun til day", () => {
    expect(classifyDrop({ type: "stop" }, { type: "day" })).toBe("stop-to-day");
    // stop → route er ikke understøttet
    expect(classifyDrop({ type: "stop" }, { type: "route" })).toBe("noop");
  });
});

describe("dropKeyFor", () => {
  it("genererer stabile nøgler pr. drop-type", () => {
    expect(dropKeyFor({ type: "job", job: { id: "j1" } }, { type: "route", routeId: "r1" }))
      .toBe("job:j1->route:r1");
    expect(dropKeyFor({ type: "job", job: { id: "j2" } }, { type: "day", date: "2026-06-01" }))
      .toBe("job:j2->day:2026-06-01");
    expect(dropKeyFor({ type: "stop", stop: { id: "s1" } }, { type: "day", date: "2026-06-01" }))
      .toBe("stop:s1->day:2026-06-01");
    expect(dropKeyFor({ type: "route", route: { id: "r1" } }, { type: "route", routeId: "r2" }))
      .toBe("route:r1->route:r2");
    expect(dropKeyFor({ type: "route", route: { id: "r1" } }, { type: "day", date: "2026-06-01" }))
      .toBe("route:r1->day:2026-06-01");
  });

  it("returnerer null for ukendte kombinationer", () => {
    expect(dropKeyFor({ type: "stop", stop: { id: "s1" } }, { type: "route", routeId: "r1" })).toBeNull();
    expect(dropKeyFor(null, null)).toBeNull();
  });
});

describe("targetKeyFor", () => {
  it("mapper over til 'route:' eller 'day:' præfix", () => {
    expect(targetKeyFor({ type: "route", routeId: "r1" })).toBe("route:r1");
    expect(targetKeyFor({ type: "day", date: "2026-06-01" })).toBe("day:2026-06-01");
    expect(targetKeyFor({ type: "stop" })).toBeNull();
    expect(targetKeyFor(null)).toBeNull();
  });
});

describe("computeTargetDateForGuard", () => {
  it("returnerer overData.date for day-targets", () => {
    expect(computeTargetDateForGuard({ type: "day", date: "2026-06-01" }, new Map()))
      .toBe("2026-06-01");
  });

  it("slår route_date op via routesById for route-targets", () => {
    const routesById = new Map<string, { route_date?: string | null }>([
      ["r1", { route_date: "2026-07-15" }],
    ]);
    expect(computeTargetDateForGuard({ type: "route", routeId: "r1" }, routesById))
      .toBe("2026-07-15");
  });

  it("trim'er timestamps til yyyy-MM-dd", () => {
    expect(computeTargetDateForGuard({ type: "day", date: "2026-06-01T08:00:00Z" }, new Map()))
      .toBe("2026-06-01");
  });

  it("returnerer null for korrupte datoer", () => {
    expect(computeTargetDateForGuard({ type: "day", date: "junk-data" }, new Map())).toBeNull();
    expect(computeTargetDateForGuard({ type: "day", date: "" }, new Map())).toBeNull();
    expect(computeTargetDateForGuard({ type: "day" }, new Map())).toBeNull();
    expect(computeTargetDateForGuard(null, new Map())).toBeNull();
  });

  it("returnerer null hvis route ikke findes i routesById", () => {
    expect(computeTargetDateForGuard({ type: "route", routeId: "missing" }, new Map())).toBeNull();
  });
});
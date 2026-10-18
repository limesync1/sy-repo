import { describe, it, expect } from "vitest";
import { buildDayMapRoutes } from "./MobileDayMapSheet";

describe("buildDayMapRoutes", () => {
  it("viser kun valgt dags stop med koordinater og tæller manglende", () => {
    const routes = [
      { id: "a", route_date: "2026-10-18", color: "#f00", stops: [{ id: "1" }, { id: "2", latitude: 56.1, longitude: 9.1 }] },
      { id: "b", route_date: "2026-10-19", stops: [{ id: "3", latitude: 56, longitude: 9 }] },
    ];
    const { mapRoutes, missing } = buildDayMapRoutes(routes, "2026-10-18", [{ id: "1", latitude: 56.2, longitude: 9.2 }]);
    expect(mapRoutes).toHaveLength(1);
    expect(mapRoutes[0].stops.map((s) => s.id)).toEqual(["1", "2"]);
    expect(missing).toBe(0);
    expect(buildDayMapRoutes(routes, "2026-10-18").missing).toBe(1);
  });
});

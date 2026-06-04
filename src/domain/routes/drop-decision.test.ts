import { describe, expect, it } from "vitest";
import { decideDrop, type DecideDropCtx } from "./drop-decision";

const TODAY = "2026-06-04";

const baseCtx = (overrides: Partial<DecideDropCtx> = {}): DecideDropCtx => ({
  todayLocal: TODAY,
  calendarRoutesRaw: [],
  virtualCalendarRoutes: [],
  ...overrides,
});

describe("decideDrop", () => {
  it("returnerer noop hvis active eller over mangler", () => {
    expect(decideDrop(null, null, baseCtx()).kind).toBe("noop");
    expect(decideDrop({ type: "job" }, null, baseCtx()).kind).toBe("noop");
  });

  it("blokerer drop på dato før i dag", () => {
    const d = decideDrop(
      { type: "job", job: { id: "j1" } },
      { type: "day", date: "2026-06-01" },
      baseCtx(),
    );
    expect(d.kind).toBe("blocked");
    if (d.kind === "blocked") expect(d.title).toMatch(/før i dag/);
  });

  it("blokerer flet af projiceret rute til rute", () => {
    const d = decideDrop(
      { type: "route", route: { id: "v1", isVirtual: true } },
      { type: "route", routeId: "r2" },
      baseCtx({ calendarRoutesRaw: [{ id: "r2", route_date: TODAY }] }),
    );
    expect(d.kind).toBe("blocked");
    if (d.kind === "blocked") expect(d.title).toMatch(/projiceret rute/);
  });

  it("åbner projected-move dialog når dato er ledig", () => {
    const d = decideDrop(
      { type: "route", route: { id: "v1", isVirtual: true, route_date: TODAY, baseRouteId: "b1", name: "Rute A" } },
      { type: "day", date: "2026-06-05" },
      baseCtx(),
    );
    expect(d.kind).toBe("dialog");
    if (d.kind === "dialog" && d.dialog.type === "projected-move") {
      expect(d.dialog.baseRouteId).toBe("b1");
      expect(d.dialog.toDate).toBe("2026-06-05");
    }
  });

  it("blokerer projected-move ved kollision med faktisk rute i samme serie", () => {
    const d = decideDrop(
      { type: "route", route: { id: "v1", isVirtual: true, route_date: TODAY, baseRouteId: "b1" } },
      { type: "day", date: "2026-06-05" },
      baseCtx({
        calendarRoutesRaw: [{ id: "r9", route_date: "2026-06-05", base_route_id: "b1" }],
      }),
    );
    expect(d.kind).toBe("blocked");
  });

  it("åbner route-merge dialog", () => {
    const d = decideDrop(
      { type: "route", route: { id: "r1", route_date: TODAY } },
      { type: "route", routeId: "r2" },
      baseCtx({ calendarRoutesRaw: [{ id: "r2", route_date: TODAY }] }),
    );
    expect(d.kind).toBe("dialog");
    if (d.kind === "dialog") expect(d.dialog.type).toBe("route-merge");
  });

  it("blokerer merge ind i projiceret target-rute", () => {
    const d = decideDrop(
      { type: "route", route: { id: "r1", route_date: TODAY } },
      { type: "route", routeId: "v2" },
      baseCtx({ calendarRoutesRaw: [{ id: "v2", route_date: TODAY, isVirtual: true }] }),
    );
    expect(d.kind).toBe("blocked");
  });

  it("åbner route-move dialog", () => {
    const d = decideDrop(
      { type: "route", route: { id: "r1", route_date: TODAY } },
      { type: "day", date: "2026-06-10" },
      baseCtx(),
    );
    expect(d.kind).toBe("dialog");
    if (d.kind === "dialog") expect(d.dialog.type).toBe("route-move");
  });

  it("blokerer route-move ved serie-kollision", () => {
    const d = decideDrop(
      { type: "route", route: { id: "r1", route_date: TODAY, base_route_id: "b1" } },
      { type: "day", date: "2026-06-10" },
      baseCtx({
        calendarRoutesRaw: [{ id: "r9", route_date: "2026-06-10", base_route_id: "b1" }],
      }),
    );
    expect(d.kind).toBe("blocked");
  });

  it("blokerer job-til-rute hvis aftalen er pending", () => {
    const d = decideDrop(
      { type: "job", job: { id: "j1", status: "pending" } },
      { type: "route", routeId: "r1" },
      baseCtx({ calendarRoutesRaw: [{ id: "r1", route_date: TODAY }] }),
    );
    expect(d.kind).toBe("blocked");
    if (d.kind === "blocked") expect(d.title).toMatch(/godkendes/);
  });

  it("blokerer job-til-projiceret-rute", () => {
    const d = decideDrop(
      { type: "job", job: { id: "j1", status: "active" } },
      { type: "route", routeId: "v1" },
      baseCtx({ calendarRoutesRaw: [{ id: "v1", route_date: TODAY, isVirtual: true }] }),
    );
    expect(d.kind).toBe("blocked");
  });

  it("commit add-stop-to-route for gyldigt job→rute drop", () => {
    const d = decideDrop(
      { type: "job", job: { id: "j1", status: "active" } },
      { type: "route", routeId: "r1" },
      baseCtx({ calendarRoutesRaw: [{ id: "r1", route_date: TODAY, name: "Mandag Nord" }] }),
    );
    expect(d.kind).toBe("commit");
    if (d.kind === "commit" && d.op.type === "add-stop-to-route") {
      expect(d.op.routeId).toBe("r1");
      expect(d.op.targetDate).toBe(TODAY);
      expect(d.op.targetLabel).toContain("Mandag Nord");
    }
  });

  it("commit create-route-with-stop for job→dag drop", () => {
    const d = decideDrop(
      { type: "job", job: { id: "j1", status: "active" } },
      { type: "day", date: "2026-06-10" },
      baseCtx(),
    );
    expect(d.kind).toBe("commit");
    if (d.kind === "commit") expect(d.op.type).toBe("create-route-with-stop");
  });

  it("blokerer flyt af projiceret stop", () => {
    const d = decideDrop(
      { type: "stop", stop: { id: "virtual-stop:abc", isVirtual: true } },
      { type: "day", date: "2026-06-10" },
      baseCtx(),
    );
    expect(d.kind).toBe("blocked");
  });

  it("noop hvis stop droppes på samme dato som nuværende rute", () => {
    const d = decideDrop(
      { type: "stop", stop: { id: "s1", route_id: "r1" } },
      { type: "day", date: TODAY },
      baseCtx({ calendarRoutesRaw: [{ id: "r1", route_date: TODAY }] }),
    );
    expect(d.kind).toBe("noop");
  });

  it("commit move-stop-to-day for gyldigt flyt", () => {
    const d = decideDrop(
      { type: "stop", stop: { id: "s1", route_id: "r1" } },
      { type: "day", date: "2026-06-10" },
      baseCtx({ calendarRoutesRaw: [{ id: "r1", route_date: TODAY }] }),
    );
    expect(d.kind).toBe("commit");
    if (d.kind === "commit" && d.op.type === "move-stop-to-day") {
      expect(d.op.newDate).toBe("2026-06-10");
      expect(d.op.currentRouteDate).toBe(TODAY);
    }
  });
});
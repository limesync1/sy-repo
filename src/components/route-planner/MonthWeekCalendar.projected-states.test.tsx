import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { format, addDays } from "date-fns";
import { MonthWeekCalendar, type CalendarRoute } from "./MonthWeekCalendar";

const makeRoute = (date: string): CalendarRoute =>
  ({
    id: `virtual:base-1:${date}`,
    baseRouteId: "base-1",
    business_id: "b1",
    employee_id: null,
    route_date: date,
    status: "planned",
    name: "Lonnie Larsen",
    color: "hsl(var(--primary))",
    total_distance_km: null,
    total_duration_minutes: null,
    optimized_at: null,
    notes: null,
    start_address: "Startvej 1",
    start_latitude: null,
    start_longitude: null,
    planned_start_time: "08:00:00",
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
    isVirtual: true,
    stops: [
      {
        id: `vs:${date}`,
        route_id: `virtual:base-1:${date}`,
        sequence: 0,
        status: "planned",
        customer_name: "Kunde",
        address: "Vej 1",
        service_summary: "Test-service",
      } as any,
    ],
    attachedEmployeeCount: 0,
    attachedEmployees: [],
  }) as unknown as CalendarRoute;

const ymd = (d: Date) => format(d, "yyyy-MM-dd");

const renderRoute = (route: CalendarRoute) =>
  render(
    <DndContext>
      <MonthWeekCalendar
        view="week"
        anchorDate={route.route_date}
        routes={[route]}
        onSelectRoute={vi.fn()}
        onSelectStop={vi.fn()}
        onCreateRoute={vi.fn()}
        onOptimizeRoute={vi.fn()}
      />
    </DndContext>,
  );

describe("MonthWeekCalendar — projected route states", () => {
  it("FUTURE: viser præcis ét lås-badge med 'Låst' og tooltip om oplåsning", () => {
    const date = ymd(addDays(new Date(), 14));
    renderRoute(makeRoute(date));
    // Ét — og kun ét — lås-relateret badge.
    const locked = screen.getAllByLabelText(/Projiceret, låst indtil/);
    expect(locked).toHaveLength(1);
    expect(locked[0].getAttribute("title") || "").toMatch(/låst indtil/i);
    expect(screen.queryByLabelText(/Aktiv i dag/i)).toBeNull();
    expect(screen.queryByLabelText(/Historisk/i)).toBeNull();
    expect(screen.getByText("Låst")).toBeInTheDocument();
  });

  it("TODAY: viser 'I dag'-badge uden lås", () => {
    const date = ymd(new Date());
    renderRoute(makeRoute(date));
    expect(screen.getByLabelText(/aktiv i dag/i)).toBeInTheDocument();
    expect(screen.queryByText("Låst")).toBeNull();
  });

  it("PAST: viser 'Historisk'-badge uden lås", () => {
    const date = ymd(addDays(new Date(), -10));
    renderRoute(makeRoute(date));
    expect(screen.getByLabelText(/historisk projiceret/i)).toBeInTheDocument();
    expect(screen.queryByText("Låst")).toBeNull();
  });
});
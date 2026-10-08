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
  it("FUTURE: viser ét 'Forventet'-mærke", () => {
    renderRoute(makeRoute(ymd(addDays(new Date(), 14))));
    expect(screen.getAllByLabelText(/^Forventet — den faste rute kører igen denne dag$/)).toHaveLength(1);
  });

  it("TODAY: viser 'Forventet i dag'", () => {
    renderRoute(makeRoute(ymd(new Date())));
    expect(screen.getByLabelText(/^Forventet i dag — den faste rute kører igen i dag$/)).toBeInTheDocument();
  });

  it("PAST: viser tidligere forventet besøg", () => {
    renderRoute(makeRoute(ymd(addDays(new Date(), -10))));
    expect(screen.getByLabelText(/^Forventet besøg der er passeret$/)).toBeInTheDocument();
  });
});

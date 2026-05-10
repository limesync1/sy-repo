import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { MonthWeekCalendar, type CalendarRoute } from "./MonthWeekCalendar";

const baseRoute = {
  id: "virtual:base-route-1:2026-05-11",
  business_id: "business-1",
  employee_id: null,
  baseRouteId: "base-route-1",
  route_date: "2026-05-11",
  status: "planned",
  name: "Original rute",
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
      id: "virtual-stop:1",
      route_id: "virtual:base-route-1:2026-05-11",
      order_id: null,
      subscription_id: null,
      sequence: 0,
      status: "planned",
      customer_name: "Kunde A",
      customer_phone: null,
      address: "Kundevej 1",
      latitude: null,
      longitude: null,
      service_summary: "Service",
      notes: null,
      planned_arrival: null,
      planned_departure: null,
      completed_at: null,
      photo_urls: null,
      duration_minutes: 30,
      time_window_start: null,
      time_window_end: null,
      distance_to_next_km: null,
      travel_time_to_next_min: null,
      assigned_employee_id: null,
      assignee_ids: [],
    },
  ],
  attachedEmployeeCount: 0,
  attachedEmployees: [],
} as unknown as CalendarRoute;

describe("MonthWeekCalendar projected route guard", () => {
  it("opens projected routes without exposing drag/move attributes or changing details", () => {
    const onSelectRoute = vi.fn();
    const onCreateRoute = vi.fn();

    const { container } = render(
      <DndContext>
        <MonthWeekCalendar
          view="week"
          anchorDate="2026-05-11"
          routes={[baseRoute]}
          onSelectRoute={onSelectRoute}
          onSelectStop={vi.fn()}
          onCreateRoute={onCreateRoute}
          onOptimizeRoute={vi.fn()}
        />
      </DndContext>,
    );

    const routeName = screen.getByText("Original rute");
    fireEvent.click(routeName);

    expect(onSelectRoute).toHaveBeenCalledTimes(1);
    expect(onSelectRoute.mock.calls[0][0]).toMatchObject({
      id: "virtual:base-route-1:2026-05-11",
      baseRouteId: "base-route-1",
      route_date: "2026-05-11",
      name: "Original rute",
      color: "hsl(var(--primary))",
      isVirtual: true,
    });
    expect(onCreateRoute).not.toHaveBeenCalled();
    expect(container.querySelector('[role="button"][aria-describedby]')).toBeNull();
    expect(screen.getByText("Basis")).toBeInTheDocument();
  });
});

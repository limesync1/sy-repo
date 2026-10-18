import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { AgendaCalendar } from "./AgendaCalendar";
import type { CalendarRoute } from "./MonthWeekCalendar";

afterEach(cleanup);
const route = (id: string, date: string): CalendarRoute => ({
  id, route_date: date, name: id, isVirtual: true, stops: [], attachedEmployees: [], attachedEmployeeCount: 0,
} as unknown as CalendarRoute);

describe("mobile agenda interactions", () => {
  it("opens the selected day's route without another day's route", () => {
    const onSelectRoute = vi.fn();
    const selected = route("Selected route", "2026-10-18");
    render(<DndContext><AgendaCalendar selectedDayOnly view="week" anchorDate="2026-10-18" routes={[selected, route("Other route", "2026-10-19")]} onSelectRoute={onSelectRoute} onSelectStop={vi.fn()} onCreateRoute={vi.fn()} onOptimizeRoute={vi.fn()} /></DndContext>);
    expect(screen.queryByText("Other route")).toBeNull();
    fireEvent.keyDown(screen.getByRole("button", { name: "Åbn Selected route" }), { key: "Enter" });
    expect(onSelectRoute).toHaveBeenCalledWith(selected);
  });
});
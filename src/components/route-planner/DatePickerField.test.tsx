import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DatePickerField } from "./DatePickerField";

vi.mock("./RouteAwareCalendar", () => ({ RouteAwareCalendar: () => null }));
vi.mock("./route-calendar-hints-context", () => ({ useRouteCalendarHints: () => ({}) }));
vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
afterEach(() => vi.useRealTimers());

describe("date picker restrictions", () => {
  it("prevents quick picks from bypassing the minimum date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-26T12:00:00Z"));
    const onChange = vi.fn();
    render(<DatePickerField value="2026-10-28" minDate="2026-10-28" onChange={onChange} />);
    expect(screen.getByRole("button", { name: "I dag" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "I morgen" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Næste mandag" }));
    expect(onChange).toHaveBeenCalledWith("2026-11-02");
  });
  it("disables the date field when an already-created route is being retried", () => {
    render(<DatePickerField value="2026-10-26" onChange={vi.fn()} disabled />);
    expect(screen.getByRole("button", { name: /mandag 26/i })).toBeDisabled();
  });
});
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, act } from "@testing-library/react";
import { StopTimeline } from "./StopTimeline";

const stops = [
  { id: "one", customer_name: "Anna", status: "completed", completed_at: "2026-10-03T08:00:00Z" },
  { id: "two", customer_name: "Bo", status: "planned" },
];
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe("StopTimeline", () => {
  it("never opens on updates or closes a selected stop on a timer", () => {
    vi.useFakeTimers();
    const { rerender } = render(<StopTimeline stops={stops} currentIndex={1} arrived={false} />);
    expect(screen.getByText("1 af 2 stop udført")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Stop 1: Anna/ }));
    act(() => vi.advanceTimersByTime(10000));
    rerender(<StopTimeline stops={[...stops]} currentIndex={1} arrived />);
    expect(screen.getByText(/1\. Anna · udført/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Stop 1: Anna/ })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /Stop 1: Anna/ }));
    expect(screen.getByText("1 af 2 stop udført")).toBeInTheDocument();
  });
  it("marks arrival statically with no animation", () => {
    const { container } = render(<StopTimeline stops={stops} currentIndex={1} arrived />);
    expect(screen.getByRole("button", { name: /Stop 2: Bo/ })).toHaveAttribute("aria-current", "step");
    expect(container.querySelector('[data-arrived="true"]')).toBeInTheDocument();
    expect(container.querySelector('[class*="pulse"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Stop 2: Bo/ }));
    expect(screen.getByText("2. Bo · ankommet")).toBeInTheDocument();
  });
});
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { EmployeeNotifications } from "./EmployeeNotifications";

afterEach(cleanup);
const item = { id: "test", message: "Ruten er opdateret", created_at: new Date().toISOString(), read_at: null, route_id: "route", route_stop_id: null };
describe("employee notification interactions", () => {
  it("opens with space and prevents the browser from scrolling", () => {
    const onOpen = vi.fn();
    render(<EmployeeNotifications notifications={[item]} onOpen={onOpen} onMarkAllRead={vi.fn()} onDelete={vi.fn()} onDeleteAll={vi.fn()} />);
    const row = screen.getByRole("button", { name: /Ruten er opdateret/ });
    expect(row).toHaveClass("dark:bg-accent/15", "hover:bg-secondary", "active:bg-muted");
    const event = new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
    row.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
  it("does not open a notification when deleting it using the keyboard", () => {
    const onOpen = vi.fn(); const onDelete = vi.fn();
    render(<EmployeeNotifications notifications={[item]} onOpen={onOpen} onMarkAllRead={vi.fn()} onDelete={onDelete} onDeleteAll={vi.fn()} />);
    const remove = screen.getByRole("button", { name: "Slet notifikation" });
    fireEvent.keyDown(remove, { key: "Enter" });
    fireEvent.click(remove);
    expect(onOpen).not.toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledWith("test");
  });
});
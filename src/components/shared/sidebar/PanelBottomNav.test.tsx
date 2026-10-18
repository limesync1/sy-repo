import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Users, Settings } from "lucide-react";
import PanelBottomNav from "./PanelBottomNav";

afterEach(cleanup);
describe("mobile panel navigation", () => {
  it("selects a secondary destination and closes its menu", () => {
    const onSelect = vi.fn();
    render(<PanelBottomNav primary={[{ key: "customers", label: "Kunder", icon: Users, active: false, onSelect: vi.fn() }]} more={[{ key: "settings", label: "Indstillinger", icon: Settings, active: true, onSelect }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Åbn flere menupunkter" }));
    fireEvent.click(screen.getByRole("button", { name: "Indstillinger" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
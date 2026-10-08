import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Toaster } from "./sonner";

vi.mock("sonner", () => ({
  toast: {},
  Toaster: ({ theme, position, visibleToasts }: { theme: string; position: string; visibleToasts: number }) => (
    <output data-testid="toast-config" data-theme={theme} data-position={position} data-count={visibleToasts} />
  ),
}));
afterEach(() => { cleanup(); document.documentElement.classList.remove("dark"); });

describe("notification theme ownership", () => {
  it("tracks the document theme in both directions without another theme provider", async () => {
    render(<MemoryRouter><Toaster /></MemoryRouter>);
    expect(screen.getByTestId("toast-config")).toHaveAttribute("data-theme", "light");
    document.documentElement.classList.add("dark");
    await waitFor(() => expect(screen.getByTestId("toast-config")).toHaveAttribute("data-theme", "dark"));
    document.documentElement.classList.remove("dark");
    await waitFor(() => expect(screen.getByTestId("toast-config")).toHaveAttribute("data-theme", "light"));
  });
  it("limits driving notifications to one and keeps them away from the maneuver HUD", () => {
    render(<MemoryRouter initialEntries={["/medarbejder/rute/test"]}><Toaster /></MemoryRouter>);
    expect(screen.getByTestId("toast-config")).toHaveAttribute("data-position", "bottom-right");
    expect(screen.getByTestId("toast-config")).toHaveAttribute("data-count", "1");
  });
});
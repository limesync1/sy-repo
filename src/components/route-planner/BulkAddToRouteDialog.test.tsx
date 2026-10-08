import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BulkAddToRouteDialog } from "./BulkAddToRouteDialog";

vi.mock("@/components/shared/UiArtwork", () => ({ UiArtwork: () => null }));
afterEach(cleanup);

const route = { id: "route-1", name: "Herning", route_date: "2026-10-08", employeeName: "Patrick", stopCount: 5 };
const job = { id: "job-1", customer_name: "Kunde", address: "Skolegade 7" };

describe("route selection", () => {
  it("shows stop totals and employee, and confirms an explicit selection", () => {
    const confirm = vi.fn();
    render(<BulkAddToRouteDialog open onOpenChange={vi.fn()} jobs={[job]} routes={[route]} loading={false} onRemoveJob={vi.fn()} onConfirm={confirm} />);
    expect(screen.getByText("5 stop → 6")).toBeInTheDocument();
    expect(screen.getByText("Patrick")).toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "Tilføj 1 aftale" });
    expect(submit).toBeDisabled();
    const option = screen.getByRole("button", { name: /Herning/ });
    fireEvent.click(option);
    expect(option).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(submit);
    expect(confirm).toHaveBeenCalledWith("route-1");
  });

  it("preserves selection when searching and reports no matching routes", () => {
    render(<BulkAddToRouteDialog open onOpenChange={vi.fn()} jobs={[job]} routes={[route]} loading={false} onRemoveJob={vi.fn()} onConfirm={vi.fn()} />);
    const search = screen.getByRole("textbox");
    fireEvent.change(search, { target: { value: "Patrick" } });
    expect(screen.getByRole("button", { name: /Herning/ })).toBeInTheDocument();
    fireEvent.change(search, { target: { value: "Odense" } });
    expect(screen.getByText("Ingen ruter matcher søgningen.")).toBeInTheDocument();
  });

  it("prevents confirmation without jobs and disables removal while saving", () => {
    const props = { open: true, onOpenChange: vi.fn(), routes: [route], onRemoveJob: vi.fn(), onConfirm: vi.fn() };
    const { rerender } = render(<BulkAddToRouteDialog {...props} jobs={[]} loading={false} />);
    fireEvent.click(screen.getByRole("button", { name: /Herning/ }));
    expect(screen.getByRole("button", { name: "Tilføj 0 aftaler" })).toBeDisabled();
    rerender(<BulkAddToRouteDialog {...props} jobs={[job]} loading />);
    expect(screen.getByRole("button", { name: "Fjern Kunde" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Tilføjer…" })).toBeDisabled();
  });
});
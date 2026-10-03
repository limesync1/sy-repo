import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import RoutePrintDialog from "./RoutePrintDialog";

afterEach(() => cleanup());
describe("RoutePrintDialog mobile", () => {
  it("prints registered times and the employee share, without inventing arrival", () => {
    const start = new Date("2026-10-03T08:00:00").getTime();
    render(<RoutePrintDialog open onOpenChange={vi.fn()} initialDate="2026-10-03" routes={[{ id: "receipt", date: "2026-10-03", name: "Test", receipt: { start, end: start + 3600000, customerSeconds: 1800, driveEstimateSeconds: 1800, earnings: 272 }, stops: [{ customerName: "Testkunde", completedAt: new Date(start + 3600000).toISOString(), earnings: 272 }] }]} />);
    expect(screen.getByRole("region", { name: "Arbejdskvittering" })).toHaveTextContent("272");
    expect(screen.getByRole("region", { name: "Arbejdskvittering" })).toHaveTextContent("30 min.");
    expect(screen.getByText("Ankommet: Ikke registreret")).toBeVisible();
    expect(screen.getByText(/Køretid er beregnet/)).toBeVisible();
  });
  it("blocks print while receipt data is loading or failed", () => {
    const props = { open: true, onOpenChange: vi.fn(), initialDate: "2026-10-03", routes: [{ id: "receipt", date: "2026-10-03", name: "Test", receipt: { start: null, end: null, customerSeconds: 0, driveEstimateSeconds: null, earnings: null, loading: true }, stops: [] }] };
    const { rerender } = render(<RoutePrintDialog {...props} />);
    expect(screen.getByRole("button", { name: "Print / PDF" })).toBeDisabled();
    rerender(<RoutePrintDialog {...props} routes={[{ ...props.routes[0], receipt: { ...props.routes[0].receipt, loading: false, error: true } }]} />);
    expect(screen.getByRole("alert")).toBeVisible();
    expect(screen.getByRole("button", { name: "Print / PDF" })).toBeDisabled();
  });
  it("opens preview, separates options and keeps preview available for printing", () => {
    render(<RoutePrintDialog open onOpenChange={vi.fn()} initialDate="2026-10-03" routes={[{ id: "one", date: "2026-10-03", name: "Testrute", stops: [{ customerName: "Testkunde" }] }]} />);
    const previewButton = screen.getByRole("button", { name: "Forhåndsvisning" });
    expect(previewButton).toHaveAttribute("aria-pressed", "true");
    const main = screen.getByText("Testkunde").closest("main");
    expect(main).not.toHaveClass("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Printvalg" }));
    expect(main).toHaveClass("hidden", "print:block");
    expect(previewButton).toHaveAttribute("aria-pressed", "false");
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Print / PDF" }));
    expect(print).toHaveBeenCalledOnce();
    print.mockRestore();
    fireEvent.click(previewButton);
    expect(main).not.toHaveClass("hidden");
  });
});
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import RoutePrintDialog from "./RoutePrintDialog";

afterEach(() => cleanup());
describe("RoutePrintDialog mobile", () => {
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
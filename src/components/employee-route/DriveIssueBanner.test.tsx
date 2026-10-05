import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DriveIssueBanner } from "./DriveIssueBanner";
import type { DriveIssue } from "./useDriveSafety";

const nightIssue: DriveIssue = { id: "night-map", tone: "warning", title: "Natkortet kunne ikke hentes", body: "Reservekort vises. Vejvisningen fortsætter.", action: "retry" };
afterEach(cleanup);

describe("DriveIssueBanner", () => {
  it("keeps the night-map warning in normal flow, outside the maneuver overlay", () => {
    const retry = vi.fn();
    const { container } = render(<DriveIssueBanner issues={[nightIssue]} placement="inline" onRetry={retry} />);
    expect(screen.getByRole("alert")).toHaveTextContent(nightIssue.body);
    expect(container.firstElementChild).toHaveClass("shrink-0");
    expect(container.firstElementChild).not.toHaveClass("absolute");
    expect(container.querySelector(".drive-issue-banner")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Prøv at hente natkortet igen" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("preserves location warnings and their GPS retry", () => {
    const retry = vi.fn();
    const { container } = render(<DriveIssueBanner issues={[{ ...nightIssue, id: "denied", title: "Adgang til placering er slået fra" }]} onRetry={retry} />);
    expect(container.querySelector(".drive-issue-banner")).toHaveClass("absolute");
    fireEvent.click(screen.getByRole("button", { name: "Prøv igen" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("removes the warning when the map recovers", () => {
    const { container, rerender } = render(<DriveIssueBanner issues={[nightIssue]} placement="inline" onRetry={vi.fn()} />);
    rerender(<DriveIssueBanner issues={[]} placement="inline" onRetry={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
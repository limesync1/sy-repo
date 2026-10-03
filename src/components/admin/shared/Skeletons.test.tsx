import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardSkeleton, EmployeeStatsSkeleton, SettingsSkeleton, AccountingSkeleton } from "./Skeletons";
import { AdminTabFallback } from "./AdminTabFallback";

describe("panel loading layouts", () => {
  it("renders overview immediately without loading its page module", () => {
    const { container } = render(<AdminTabFallback tab="dashboard" />);
    expect(screen.getByLabelText("Indlæser overblik")).toBeTruthy();
    expect(container.querySelector(".panel-overview-hero")).toBeTruthy();
  });
  it("uses the same overview layout during data loading", () => {
    render(<DashboardSkeleton />);
    expect(screen.getByLabelText("Indlæser overblik").getAttribute("aria-busy")).toBe("true");
  });
  it("matches statistics' five-part summary strip", () => {
    const { container } = render(<EmployeeStatsSkeleton />);
    expect(screen.getByLabelText("Indlæser statistik")).toBeTruthy();
    expect(container.querySelector(".lg\\:grid-cols-5")?.children.length).toBe(5);
  });
  it("provides named settings and accounting loading surfaces", () => {
    render(<><SettingsSkeleton /><AccountingSkeleton /></>);
    expect(screen.getByLabelText("Indlæser indstillinger")).toBeTruthy();
    expect(screen.getByLabelText("Indlæser regnskab")).toBeTruthy();
  });
});
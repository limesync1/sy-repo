import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import NextStepBar from "./NextStepBar";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("next step bar with blocked browser storage", () => {
  it("still opens and hides the guide when session storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    const open = vi.fn();
    const view = render(<NextStepBar nextStepId="services" counts={{ categoriesCount: 1, servicesCount: 0, ordersCount: 0, employeesCount: 0, routesCount: 0, accountingActive: false, accountingFeatureEnabled: false }} completedCount={1} totalCount={5} onOpenGuide={open} />);
    fireEvent.click(view.getByRole("button", { name: "Åbn guide" }));
    expect(open).toHaveBeenCalledTimes(1);
    fireEvent.click(view.getByRole("button", { name: "Skjul næste trin" }));
    expect(view.queryByRole("button", { name: "Åbn guide" })).not.toBeInTheDocument();
  });
});
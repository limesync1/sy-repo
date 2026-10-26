import { describe, expect, it, vi } from "vitest";
import { publishPanelRefresh, subscribePanelRefresh } from "./panel-refresh";

describe("legacy panel refresh", () => {
  it("refreshes accounting only for its own events and recovery", () => {
    const refresh = vi.fn();
    const unsubscribe = subscribePanelRefresh(["accounting_sync_log", "accounting_sync_queue", "accounting_sync_dlq"], refresh);
    publishPanelRefresh(["orders"]);
    expect(refresh).not.toHaveBeenCalled();
    publishPanelRefresh(["accounting_sync_log", "accounting_sync_queue"]);
    expect(refresh).toHaveBeenCalledTimes(1);
    publishPanelRefresh(null);
    expect(refresh).toHaveBeenCalledTimes(2);
    unsubscribe();
    publishPanelRefresh(null);
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
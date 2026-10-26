import { act, cleanup, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RealtimeSync } from "./RealtimeSync";
import { subscribePanelRefresh } from "@/lib/panel-refresh";

const mocks = vi.hoisted(() => ({ user: { id: "owner" } as { id: string } | null, channel: vi.fn(), removeChannel: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: mocks }));

type Handler = () => void;
let handlers: Map<string, Handler>;
let status: (value: string) => void;
let client: QueryClient;
beforeEach(() => {
  vi.useFakeTimers();
  mocks.user = { id: "owner" };
  handlers = new Map();
  const channel = {
    on: vi.fn((_type, config, callback) => { handlers.set(config.table, callback); return channel; }),
    subscribe: vi.fn((callback) => { status = callback; return channel; }),
  };
  mocks.channel.mockReturnValue(channel);
  mocks.removeChannel.mockClear();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
});
afterEach(() => { cleanup(); client.clear(); vi.useRealTimers(); });

function setup() {
  const invalidate = vi.spyOn(client, "invalidateQueries");
  render(<QueryClientProvider client={client}><RealtimeSync /></QueryClientProvider>);
  return invalidate;
}

describe("automatic panel synchronization", () => {
  it("subscribes to sent-message, accounting, invoice and earnings changes without DELETE filters", () => {
    setup();
    for (const table of ["business_owner_alerts", "customer_notification_queue", "accounting_sync_log", "accounting_sync_queue", "accounting_sync_dlq", "invoice_batches", "employee_completed_stops"])
      expect(handlers.has(table)).toBe(true);
    const channel = mocks.channel.mock.results[0].value;
    for (const [, config] of channel.on.mock.calls) {
      expect(config).toMatchObject({ event: "*", schema: "public" });
      expect(config).not.toHaveProperty("filter");
    }
    expect(handlers.has("accounting_integrations")).toBe(false);
  });
  it("coalesces a burst into one active-query refresh and one local accounting refresh", () => {
    const invalidate = setup();
    const refresh = vi.fn();
    const unsubscribe = subscribePanelRefresh(["accounting_sync_log"], refresh);
    act(() => { handlers.get("orders")?.(); handlers.get("accounting_sync_log")?.(); handlers.get("accounting_sync_queue")?.(); vi.advanceTimersByTime(299); });
    expect(invalidate).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ refetchType: "active" });
    expect(refresh).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
  it("recovers local-state and query screens after reconnect and network return", () => {
    const invalidate = setup();
    const refresh = vi.fn();
    const unsubscribe = subscribePanelRefresh(["accounting_sync_log"], refresh);
    act(() => { status("SUBSCRIBED"); vi.advanceTimersByTime(300); });
    expect(invalidate).not.toHaveBeenCalled();
    act(() => { status("CHANNEL_ERROR"); status("SUBSCRIBED"); vi.advanceTimersByTime(300); });
    expect(refresh).toHaveBeenCalledTimes(1);
    act(() => { window.dispatchEvent(new Event("online")); vi.advanceTimersByTime(300); });
    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
  it("cleans pending refreshes and subscriptions on unmount", () => {
    const invalidate = setup();
    act(() => { handlers.get("orders")?.(); });
    cleanup();
    act(() => { vi.advanceTimersByTime(300); window.dispatchEvent(new Event("online")); vi.advanceTimersByTime(300); });
    expect(invalidate).not.toHaveBeenCalled();
    expect(mocks.removeChannel).toHaveBeenCalledTimes(1);
  });
  it("actually reads refreshed statistics after an earnings event", async () => {
    let count = 1;
    const query = vi.fn(async () => count);
    client.setQueryData(["dashboard-employee-earnings", "business"], count);
    function Stats() {
      const { data } = useQuery({ queryKey: ["dashboard-employee-earnings", "business"], queryFn: query });
      return <output>{data}</output>;
    }
    const screen = render(<QueryClientProvider client={client}><RealtimeSync /><Stats /></QueryClientProvider>);
    expect(screen.getByText("1")).toBeInTheDocument();
    count = 2;
    await act(async () => { handlers.get("employee_completed_stops")?.(); await vi.advanceTimersByTimeAsync(301); });
    expect(query).toHaveBeenCalledTimes(1);
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
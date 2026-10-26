import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useAddStop } from "./useRoutes";

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: mocks }));
vi.mock("@/hooks/useMyEmployee", () => ({ useMyEmployeeId: () => null }));
vi.mock("@/lib/mutation-queue", () => ({
  routeMutationQueue: { run: (fn: () => Promise<unknown>) => fn() }, MutationQueue: class {},
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ data: { id: "stop-1" }, error: null });
  mocks.from.mockImplementation(table => {
    if (table === "order_items") return { select: () => ({ eq: () => ({ limit: async () => ({ data: [{ services: { default_employee_ids: ["employee-1"], default_employee_id: "employee-2" } }] }) }) }) };
    if (table === "route_stop_assignees") return { upsert: vi.fn().mockResolvedValue({ error: null }) };
    return { select: () => ({ eq: async () => ({ data: [] }) }) };
  });
});

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, "invalidateQueries").mockResolvedValue();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { wrapper, invalidate };
}

describe("route stop creation", () => {
  it("uses one joined lookup and retains default employee priority and server guard", async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useAddStop(), { wrapper });
    await act(async () => { await result.current.mutateAsync({ route_id: "route-1", order_id: "order-1", sequence: 3 }); });
    expect(mocks.from.mock.calls.filter(([table]) => table === "order_items")).toHaveLength(1);
    expect(mocks.from).not.toHaveBeenCalledWith("services");
    expect(mocks.rpc).toHaveBeenCalledWith("add_route_stop_idempotent", expect.objectContaining({ _payload: expect.objectContaining({ assigned_employee_id: "employee-1", sequence: 3 }) }));
    expect(invalidate).toHaveBeenCalled();
  });
  it("defers local refetches for batch callers without skipping the persisted write", async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useAddStop({ deferInvalidation: true }), { wrapper });
    await act(async () => { await result.current.mutateAsync({ route_id: "route-1", sequence: 0 }); });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(invalidate).not.toHaveBeenCalled();
  });
  it("returns server rejections instead of treating the stop as saved", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error("No access") });
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useAddStop(), { wrapper });
    await act(async () => { await expect(result.current.mutateAsync({ route_id: "route-1", sequence: 0 })).rejects.toThrow("No access"); });
    expect(invalidate).not.toHaveBeenCalled();
  });
});
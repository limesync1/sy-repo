import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useCreateService, useUpdateService, useUpsertCalculatorSteps } from "./useDatabase";

const mocks = vi.hoisted(() => ({ from: vi.fn(), deleteError: null as Error | null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.deleteError = null;
  mocks.from.mockImplementation(() => ({
    insert: vi.fn(() => ({ select: () => ({ single: async () => ({ data: { id: "service-1" }, error: null }) }) })),
    update: vi.fn(() => ({ eq: () => ({ select: () => ({ single: async () => ({ data: { id: "service-1" }, error: null }) }) }) })),
    delete: vi.fn(() => ({ eq: async () => ({ error: mocks.deleteError }) })),
  }));
});

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  // An unresolved list refetch must never delay a successful persisted save.
  const invalidate = vi.spyOn(client, "invalidateQueries").mockImplementation(() => new Promise<void>(() => {}));
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { wrapper, invalidate };
}

describe("service save latency and errors", () => {
  it("finishes creating without waiting for the service list refetch", async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(useCreateService, { wrapper });
    await act(async () => {
      expect(await result.current.mutateAsync({ business_id: "business", name: "Vinduespudsning" })).toEqual({ id: "service-1" });
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["services", "business"] });
  });
  it("finishes updating without waiting for the service list refetch", async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(useUpdateService, { wrapper });
    await act(async () => { await result.current.mutateAsync({ id: "service-1", name: "Ny titel" }); });
    expect(invalidate).toHaveBeenCalled();
  });
  it("does not write new calculator steps when deletion fails", async () => {
    mocks.deleteError = new Error("Delete rejected");
    const { wrapper } = setup();
    const { result } = renderHook(useUpsertCalculatorSteps, { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync({ serviceId: "service-1", steps: [] })).rejects.toThrow("Delete rejected");
    });
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
  it("finishes a confirmed calculator save without waiting for list refresh", async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(useUpsertCalculatorSteps, { wrapper });
    await act(async () => { await result.current.mutateAsync({ serviceId: "service-1", steps: [] }); });
    expect(invalidate).toHaveBeenCalled();
  });
});
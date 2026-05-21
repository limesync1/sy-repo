import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { callRpc, useAdminMutation } from "./useAdminMutation";

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...a: any[]) => toastSuccess(...a),
    error: (...a: any[]) => toastError(...a),
  },
}));

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, invalidateSpy, wrapper };
}

describe("callRpc", () => {
  it("returns data on success", async () => {
    const client = { rpc: vi.fn().mockResolvedValue({ data: { ok: true }, error: null }) };
    const result = await callRpc(client, "do_thing", { id: 1 });
    expect(result).toEqual({ ok: true });
    expect(client.rpc).toHaveBeenCalledWith("do_thing", { id: 1 });
  });

  it("throws Error(message) on rpc error", async () => {
    const client = { rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } }) };
    await expect(callRpc(client, "fail")).rejects.toThrow("boom");
  });
});

describe("useAdminMutation", () => {
  beforeEach(() => {
    toastSuccess.mockClear();
    toastError.mockClear();
  });

  it("shows success toast and invalidates queries on success", async () => {
    const { wrapper, invalidateSpy } = makeWrapper();
    const onDone = vi.fn();
    const { result } = renderHook(
      () =>
        useAdminMutation<number, number>({
          mutationFn: async (n) => n * 2,
          successMessage: (d, v) => `done ${v}->${d}`,
          invalidateKeys: [["foo"], ["bar", 1]],
          onDone,
        }),
      { wrapper },
    );
    result.current.mutate(3);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(toastSuccess).toHaveBeenCalledWith("done 3->6");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["foo"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["bar", 1] });
    expect(onDone).toHaveBeenCalledWith(6, 3);
  });

  it("suppresses success toast when successMessage=false", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useAdminMutation({ mutationFn: async () => 1, successMessage: false }),
      { wrapper },
    );
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("shows error toast with error.message by default", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () =>
        useAdminMutation({
          mutationFn: async () => {
            throw new Error("nope");
          },
        }),
      { wrapper },
    );
    result.current.mutate();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toastError).toHaveBeenCalledWith("nope");
  });

  it("uses custom error string when provided", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () =>
        useAdminMutation({
          mutationFn: async () => {
            throw new Error("raw");
          },
          errorMessage: "kunne ikke gemme",
        }),
      { wrapper },
    );
    result.current.mutate();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toastError).toHaveBeenCalledWith("kunne ikke gemme");
  });

  it("suppresses error toast when errorMessage=false", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () =>
        useAdminMutation({
          mutationFn: async () => {
            throw new Error("hidden");
          },
          errorMessage: false,
        }),
      { wrapper },
    );
    result.current.mutate();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toastError).not.toHaveBeenCalled();
  });
});
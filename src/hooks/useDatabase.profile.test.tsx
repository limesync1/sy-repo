import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useUpdateProfile } from "./useDatabase";

const mocks = vi.hoisted(() => ({ from: vi.fn(), upsert: vi.fn(), select: vi.fn(), single: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));

describe("account profile persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ upsert: mocks.upsert });
    mocks.upsert.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ single: mocks.single });
  });

  it("creates a missing profile or updates it by user ID without overwriting other fields", async () => {
    const saved = { user_id: "account-id", display_name: "Patrick", avatar_url: null };
    mocks.single.mockResolvedValue({ data: saved, error: null });
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });
    await act(async () => {
      expect(await result.current.mutateAsync({ userId: "account-id", display_name: "Patrick", avatar_url: null })).toEqual(saved);
    });
    expect(mocks.from).toHaveBeenCalledWith("profiles");
    expect(mocks.upsert).toHaveBeenCalledWith(saved, { onConflict: "user_id" });
  });

  it("rejects a denied write instead of reporting success", async () => {
    const error = new Error("Denied");
    mocks.single.mockResolvedValue({ data: null, error });
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync({ userId: "account-id", display_name: "Patrick" })).rejects.toThrow("Denied");
    });
  });
});
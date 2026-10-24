import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";

const mocks = vi.hoisted(() => ({
  signup: vi.fn(), signin: vi.fn(), reset: vi.fn(), resend: vi.fn(), logout: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {
  getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  signUp: mocks.signup, signInWithPassword: mocks.signin, resetPasswordForEmail: mocks.reset,
  resend: mocks.resend, signOut: mocks.logout,
} } }));
beforeEach(() => { vi.clearAllMocks(); });

describe("shared auth calls", () => {
  it("returns confirmation status rather than signup success for an existing address", async () => {
    mocks.signup.mockResolvedValue({ data: { user: { identities: [] }, session: null }, error: null });
    const { result } = renderHook(useAuth, { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    let response;
    await act(async () => { response = await result.current.signUp(" User@Example.dk ", "unchanged password"); });
    expect(response).toEqual({ error: null, status: "confirmation_required" });
    expect(mocks.signup).toHaveBeenCalledWith(expect.objectContaining({ email: "user@example.dk", password: "unchanged password" }));
    expect(mocks.signin).not.toHaveBeenCalled();
  });
  it("returns thrown network failures instead of leaving callers stuck", async () => {
    mocks.signin.mockRejectedValue(new Error("Failed to fetch"));
    const { result } = renderHook(useAuth, { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const response = await result.current.signIn("a@example.dk", "password");
    expect(response.error?.message).toBe("Failed to fetch");
  });
  it("always sends password resets to the public recovery page", async () => {
    mocks.reset.mockResolvedValue({ error: null });
    const { result } = renderHook(useAuth, { wrapper: AuthProvider });
    await act(async () => { await result.current.resetPassword(" A@Example.dk "); });
    expect(mocks.reset).toHaveBeenCalledWith("a@example.dk", { redirectTo: `${window.location.origin}/reset-password` });
  });
  it("reports logout failure without claiming logout success", async () => {
    mocks.logout.mockResolvedValue({ error: new Error("Failed to fetch") });
    const { result } = renderHook(useAuth, { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await result.current.signOut();
    expect(mocks.toastError).toHaveBeenCalledTimes(1);
  });
});
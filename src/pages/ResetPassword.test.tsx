import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import ResetPassword from "./ResetPassword";

const mocks = vi.hoisted(() => ({ recovery: false, update: vi.fn(), logout: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ isPasswordRecovery: mocks.recovery }) }));
vi.mock("@/components/SEO", () => ({ default: () => null }));
vi.mock("@/components/landing/BlueFlowBackground", () => ({ default: () => null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {
  getUser: vi.fn().mockResolvedValue({ data: { user: { id: "signed-in-user" } }, error: null }),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  updateUser: mocks.update, signOut: mocks.logout,
} } }));
beforeEach(() => { vi.clearAllMocks(); mocks.recovery = false; window.location.hash = ""; });
it("rejects an ordinary signed-in session without a recovery link or event", async () => {
  render(<MemoryRouter><ResetPassword /></MemoryRouter>);
  await screen.findByText(/Linket er udløbet eller ugyldigt/);
  expect(screen.queryByLabelText("Ny adgangskode")).toBeNull();
  expect(mocks.update).not.toHaveBeenCalled();
});
it("submits a recovery password without current_password and signs out locally", async () => {
  mocks.recovery = true;
  mocks.update.mockResolvedValue({ error: null });
  mocks.logout.mockResolvedValue({ error: null });
  render(<MemoryRouter><ResetPassword /></MemoryRouter>);
  fireEvent.change(await screen.findByLabelText("Ny adgangskode"), { target: { value: "New-password-123" } });
  fireEvent.change(screen.getByLabelText("Gentag adgangskode"), { target: { value: "New-password-123" } });
  fireEvent.click(screen.getByRole("button", { name: "Gem ny adgangskode" }));
  await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({ password: "New-password-123" }));
  await waitFor(() => expect(mocks.logout).toHaveBeenCalledWith({ scope: "local" }));
});
it("does not send mismatched passwords to the server", async () => {
  mocks.recovery = true;
  render(<MemoryRouter><ResetPassword /></MemoryRouter>);
  fireEvent.change(await screen.findByLabelText("Ny adgangskode"), { target: { value: "New-password-123" } });
  fireEvent.change(screen.getByLabelText("Gentag adgangskode"), { target: { value: "Another-password-123" } });
  fireEvent.click(screen.getByRole("button", { name: "Gem ny adgangskode" }));
  expect(mocks.update).not.toHaveBeenCalled();
});
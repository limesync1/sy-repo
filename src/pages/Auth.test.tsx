import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Auth from "./Auth";

const mocks = vi.hoisted(() => ({ signIn: vi.fn(), signUp: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({
  user: null, loading: false, signIn: mocks.signIn, signUp: mocks.signUp,
  resetPassword: vi.fn(), resendConfirmation: vi.fn(), emailCooldown: 0,
}) }));
vi.mock("@/components/SEO", () => ({ default: () => null }));
vi.mock("@/components/landing/BlueFlowBackground", () => ({ default: () => null }));
vi.mock("@/lib/detect-user-role", () => ({ detectUserRole: vi.fn(), ROLE_HOME: {} }));
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });
afterEach(cleanup);

it("locks the submitted email and password until login finishes, then allows retry", async () => {
  let resolve: (result: { error: Error }) => void = () => {};
  mocks.signIn.mockImplementation(() => new Promise(done => { resolve = done; }));
  render(<MemoryRouter><Auth /></MemoryRouter>);
  const email = screen.getByLabelText("E-mail") as HTMLInputElement;
  const password = screen.getByLabelText("Adgangskode") as HTMLInputElement;
  fireEvent.change(email, { target: { value: "test@example.com" } });
  fireEvent.change(password, { target: { value: "wrong-password" } });
  fireEvent.submit(email.closest("form") as HTMLFormElement);
  expect(email.disabled).toBe(true);
  expect(password.disabled).toBe(true);
  expect(mocks.signIn).toHaveBeenCalledTimes(1);
  await act(async () => resolve({ error: new Error("Invalid login credentials") }));
  expect(email.disabled).toBe(false);
  expect(password.disabled).toBe(false);
  expect(document.activeElement).toBe(screen.getByRole("alert"));
});

it("clears password and its visibility when switching to account creation", () => {
  render(<MemoryRouter><Auth /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Adgangskode"), { target: { value: "private-password" } });
  fireEvent.click(screen.getByRole("button", { name: "Vis adgangskode" }));
  fireEvent.click(screen.getAllByRole("button", { name: "Opret konto" })[0]);
  const password = screen.getByLabelText("Adgangskode") as HTMLInputElement;
  expect(password.value).toBe("");
  expect(password.type).toBe("password");
  expect(mocks.signUp).not.toHaveBeenCalled();
});
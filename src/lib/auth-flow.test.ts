import { describe, expect, it } from "vitest";
import { getSignupStatus, normalizeAuthEmail, isValidAuthEmail, isRecoveryLink } from "./auth-flow";
import { translateAuthError } from "./auth-errors";

describe("auth rules", () => {
  it("does not claim an obfuscated repeated signup created a new account", () => {
    expect(getSignupStatus({ user: { identities: [] }, session: null })).toBe("confirmation_required");
  });
  it("does not sign in a signup that still needs email confirmation", () => {
    expect(getSignupStatus({ user: { identities: [{}] }, session: null })).toBe("confirmation_required");
  });
  it("recognizes a genuine signed-in signup", () => {
    expect(getSignupStatus({ user: { identities: [{}] }, session: { user: { id: "new-user" } } })).toBe("signed_in");
  });
  it("normalizes mixed case and surrounding whitespace in every email entry point", () => {
    expect(normalizeAuthEmail("  William@Adely.dk  ")).toBe("william@adely.dk");
  });
  it("rejects malformed email before a request", () => {
    expect(isValidAuthEmail("name@" )).toBe(false);
    expect(isValidAuthEmail("a b@example.dk")).toBe(false);
    expect(isValidAuthEmail("name@example.dk")).toBe(true);
  });
  it("does not treat an ordinary sign-in link as password recovery", () => {
    expect(isRecoveryLink("#type=signup&access_token=test")).toBe(false);
    expect(isRecoveryLink("")).toBe(false);
    expect(isRecoveryLink("#type=recovery&access_token=test")).toBe(true);
    expect(isRecoveryLink("#type=recovery&error_code=otp_expired")).toBe(false);
  });
  it("never passes unknown server internals into a public error", () => {
    expect(translateAuthError({ message: "SQL failure private_table" }, "fallback")).toBe("fallback");
  });
  it("classifies rate limits by code even when the message is empty", () => {
    expect(translateAuthError({ code: "over_email_send_rate_limit", status: 429 })).not.toBe("Noget gik galt. Prøv igen.");
  });
  it("does not classify breached passwords as a short password", () => {
    expect(translateAuthError({ code: "weak_password", message: "Password is weak" })).not.toContain("for kort");
  });
  it("does not reveal a missing account on login", () => {
    expect(translateAuthError({ code: "user_not_found" })).not.toContain("finde en konto");
  });
});
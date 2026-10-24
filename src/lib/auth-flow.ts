/** One normalization for all email/password entry points. Passwords stay untouched. */
export const normalizeAuthEmail = (email: string) => email.trim().toLowerCase();
export const isValidAuthEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeAuthEmail(email));

export type SignupStatus = "signed_in" | "confirmation_required";

/** Cloud may deliberately return an obfuscated user for repeated signups.
 * Never call that a new account or use it to look up whether an email exists. */
export function getSignupStatus(data: {
  user: { identities?: unknown[] } | null;
  session: { user: { id: string } } | null;
}): SignupStatus {
  if (data.user?.identities?.length === 0) return "confirmation_required";
  return data.session ? "signed_in" : "confirmation_required";
}

export const AUTH_EMAIL_COOLDOWN_SECONDS = 60;

export function isRecoveryLink(hash: string): boolean {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return params.get("type") === "recovery" && !params.has("error") && !params.has("error_code");
}
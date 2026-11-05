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

/** Try supplied credentials, not an account-existence lookup. Only credential
 * rejection permits signup; network/rate-limit failures must stop the flow. */
export async function authenticateBeforeSignup(signIn: () => Promise<{ error: Error | null }>): Promise<"signed_in" | "confirmation_required" | "signup_required"> {
  const { error } = await signIn();
  if (!error) return "signed_in";
  const code = (error as Error & { code?: string }).code;
  if (code === "email_not_confirmed") return "confirmation_required";
  if (code === "invalid_credentials" || error.message.toLowerCase().includes("invalid login credentials")) return "signup_required";
  throw error;
}

export function isRecoveryLink(hash: string): boolean {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return params.get("type") === "recovery" && !params.has("error") && !params.has("error_code");
}
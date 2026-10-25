import { describe, expect, it } from "vitest";
import { buildPlatformSignupAlert } from "../../supabase/functions/_shared/platform-signup-alert";

describe("platform owner signup notifications", () => {
  it("sends each business event only to william@adely.dk", () => {
    const alert = buildPlatformSignupAlert({ kind: "business", id: "business-123", name: "Vinduespudser", email: "ejer@example.dk" });
    expect(alert.recipient).toBe("william@adely.dk");
    expect(alert.templateData.rows.find(row => row.label === "Virksomhed")?.value).toBe("Vinduespudser");
  });
  it("sends each waitlist event only to william@adely.dk", () => {
    const alert = buildPlatformSignupAlert({ kind: "waitlist", id: "signup-123", email: "kunde@example.dk", role: "kunde" });
    expect(alert.recipient).toBe("william@adely.dk");
    expect(alert.templateData.rows.find(row => row.label === "E-mail")?.value).toBe("kunde@example.dk");
  });
  it("deduplicates retries of one signup without combining different signups", () => {
    const first = buildPlatformSignupAlert({ kind: "waitlist", id: "one" });
    const retry = buildPlatformSignupAlert({ kind: "waitlist", id: "one" });
    const second = buildPlatformSignupAlert({ kind: "waitlist", id: "two" });
    expect(first.idempotencyKey).toBe(retry.idempotencyKey);
    expect(first.idempotencyKey).not.toBe(second.idempotencyKey);
  });
});
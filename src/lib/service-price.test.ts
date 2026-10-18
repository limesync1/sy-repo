import { describe, expect, it } from "vitest";
import { formatServicePrice } from "../../supabase/functions/_shared/transactional-email-templates/_service-price";
import { formatAmount, formatPrice } from "./price-format";

describe("service amounts excluding VAT", () => {
  it("preserves the entered amount instead of adding or removing VAT", () => {
    const displayedAmount = formatServicePrice(100).split(/\s*kr\./)[0];
    expect(displayedAmount).toBe(formatAmount(100));
  });

  it("preserves service-price decimals", () => {
    const displayedAmount = formatServicePrice(4840.6).split(/\s*kr\./)[0];
    expect(displayedAmount).toBe("4.840,60");
  });

  it("does not change the shared platform-price formatter", () => {
    expect(formatPrice(100)).toBe("100,00 kr.");
  });
});
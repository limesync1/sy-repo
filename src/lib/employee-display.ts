/**
 * Sanitize text shown in the employee app.
 * Removes any monetary amounts (e.g. "599 kr", "1.299 kr.", "1 250 kr")
 * so employees never see prices for the jobs they perform.
 */
export const stripPrices = (text: string | null | undefined): string => {
  if (!text) return "";
  return text
    // Remove patterns like "Ordre · 599 kr" or "· 1.299 kr."
    .replace(/[·,]?\s*\d[\d.\s]*\s*kr\.?/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[·,]\s*$/, "")
    .trim();
};

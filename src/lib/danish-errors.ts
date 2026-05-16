/**
 * Oversætter typiske engelske fejlbeskeder fra Postgres / Supabase / edge
 * functions til danske beskeder, så slutbrugere aldrig ser engelsk tekst.
 *
 * Brug `toDanishError(e, fallback)` i alle catch-blokke i UI-laget.
 */

const TRANSLATIONS: Array<[RegExp, string]> = [
  // Sletning af aftaler
  [/order not found/i, "Aftalen blev ikke fundet. Prøv at genindlæse siden."],
  [/not authorized to delete this order/i, "Du har ikke rettigheder til at slette denne aftale."],
  [/only cancelled orders can be deleted/i, "Kun annullerede aftaler kan slettes."],

  // Autorisation / auth
  [/not[_ ]authenticated/i, "Du er ikke logget ind. Log ind igen og prøv på ny."],
  [/not[_ ]authorized/i, "Du har ikke rettigheder til denne handling."],
  [/permission denied/i, "Du har ikke rettigheder til denne handling."],
  [/jwt expired/i, "Din session er udløbet. Log ind igen."],
  [/row[- ]level security/i, "Du har ikke rettigheder til denne handling."],

  // Almindelige DB-fejl
  [/duplicate key value/i, "Denne værdi findes allerede."],
  [/violates foreign key/i, "Handlingen kan ikke gennemføres — der er stadig data, der peger på dette."],
  [/violates not[- ]null/i, "Et obligatorisk felt mangler."],
  [/value too long/i, "Værdien er for lang."],

  // Netværk
  [/failed to fetch/i, "Kunne ikke kontakte serveren. Tjek din internetforbindelse."],
  [/network[- ]error/i, "Netværksfejl. Prøv igen om lidt."],
  [/timeout/i, "Anmodningen tog for lang tid. Prøv igen."],
];

const looksEnglish = (msg: string) => /[a-z]/i.test(msg) && !/[æøåÆØÅ]/.test(msg);

export const toDanishError = (e: unknown, fallback = "Noget gik galt. Prøv igen."): string => {
  const raw = typeof e === "string"
    ? e
    : (e as any)?.message ?? (e as any)?.error_description ?? (e as any)?.error ?? "";
  const msg = String(raw || "").trim();
  if (!msg) return fallback;

  for (const [pattern, danish] of TRANSLATIONS) {
    if (pattern.test(msg)) return danish;
  }

  // Hvis beskeden allerede ser dansk ud (indeholder æ/ø/å), brug den.
  if (/[æøåÆØÅ]/.test(msg)) return msg;

  // Ellers — beskeden er sandsynligvis engelsk og ikke i mappingen.
  // Returnér fallback, så brugeren aldrig ser engelsk tekst.
  if (looksEnglish(msg)) return fallback;

  return msg;
};

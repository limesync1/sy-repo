/**
 * Oversæt Supabase/auth-fejlbeskeder til brugervenlige danske beskeder.
 * Brug i stedet for at vise rå `error.message` fra signIn/signUp m.m.
 */
export function translateAuthError(input: unknown, fallback = "Noget gik galt. Prøv igen."): string {
  const raw =
    typeof input === "string"
      ? input
      : (input as any)?.message || (input as any)?.error_description || (input as any)?.error || "";
  const msg = String(raw || "").toLowerCase();

  if (!msg) return fallback;

  // Login-fejl
  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials"))
    return "Forkert e-mail eller adgangskode. Tjek stavemåden — eller tryk på \"Glemt adgangskode?\" hvis du har glemt din kode.";
  if (msg.includes("email not confirmed") || msg.includes("email_not_confirmed"))
    return "Din e-mail er ikke bekræftet endnu. Tjek din indbakke (og spam) for bekræftelseslinket.";
  if (msg.includes("user not found"))
    return "Vi kunne ikke finde en konto med denne e-mail. Tjek stavemåden eller opret en ny konto.";

  // Oprettelse / signup
  if (msg.includes("user already registered") || msg.includes("already registered") || msg.includes("already exists"))
    return "Der findes allerede en konto med denne e-mail. Prøv at logge ind i stedet.";
  if (msg.includes("password") && (msg.includes("short") || msg.includes("at least") || msg.includes("min") || msg.includes("weak")))
    return "Adgangskoden er for kort. Vælg mindst 6 tegn.";
  if (msg.includes("password") && msg.includes("characters"))
    return "Adgangskoden opfylder ikke kravene. Brug mindst 6 tegn.";
  if (msg.includes("invalid email") || (msg.includes("email") && msg.includes("invalid")))
    return "E-mailadressen ser ikke korrekt ud. Tjek formatet, fx navn@eksempel.dk.";
  if (msg.includes("signup") && msg.includes("disabled"))
    return "Oprettelse af nye konti er midlertidigt deaktiveret. Prøv igen senere.";

  // Rate limiting
  if (msg.includes("rate limit") || msg.includes("too many requests") || msg.includes("over_email_send_rate_limit"))
    return "Vi har sendt for mange beskeder lige nu. Vent et par minutter og prøv igen.";

  // OTP / magic link
  if (msg.includes("otp") || msg.includes("token") || msg.includes("expired"))
    return "Linket eller koden er udløbet. Anmod om en ny og prøv igen.";

  // Netværk
  if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("networkerror"))
    return "Kan ikke nå serveren. Tjek din internetforbindelse og prøv igen.";

  // Default — vis fallback men behold første sætning hvis rimelig kort
  const firstSentence = String(raw).split(/[.\n]/)[0]?.trim();
  if (firstSentence && firstSentence.length > 0 && firstSentence.length < 140) {
    return firstSentence.endsWith(".") ? firstSentence : firstSentence + ".";
  }
  return fallback;
}

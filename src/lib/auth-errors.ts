/**
 * Oversæt Supabase/auth-fejlbeskeder til brugervenlige danske beskeder.
 * Brug i stedet for at vise rå `error.message` fra signIn/signUp m.m.
 */
export function translateAuthError(input: unknown, fallback = "Noget gik galt. Prøv igen."): string {
  const details = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const raw = typeof input === "string" ? input : details.message || details.error_description || details.error || "";
  const msg = `${String(details.code || "")} ${String(raw || "")}`.trim().toLowerCase();

  if (!msg) return fallback;

  // Login-fejl
  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials"))
    return "Forkert e-mail eller adgangskode. Tjek stavemåden — eller tryk på \"Glemt adgangskode?\" hvis du har glemt din kode.";
  if (msg.includes("email not confirmed") || msg.includes("email_not_confirmed"))
    return "Din e-mail er ikke bekræftet endnu. Tjek din indbakke (og spam) for bekræftelseslinket.";
  if (msg.includes("user not found") || msg.includes("user_not_found"))
    return "Forkert e-mail eller adgangskode. Tjek oplysningerne, eller vælg Glemt adgangskode.";

  // Oprettelse / signup
  if (msg.includes("user already registered") || msg.includes("already registered") || msg.includes("already exists"))
    return "Der findes allerede en konto med denne e-mail. Prøv at logge ind i stedet.";
  if (msg.includes("pwned") || msg.includes("breached") || msg.includes("weak_password"))
    return "Vælg en stærkere adgangskode, som du ikke bruger andre steder. Den valgte kode opfylder ikke sikkerhedskravene.";
  if (msg.includes("password") && (msg.includes("short") || msg.includes("at least") || msg.includes("min") || msg.includes("weak")))
    return "Adgangskoden er for kort. Vælg mindst 6 tegn.";
  if (msg.includes("password") && msg.includes("characters"))
    return "Adgangskoden opfylder ikke kravene. Brug mindst 6 tegn.";
  if (msg.includes("invalid email") || (msg.includes("email") && msg.includes("invalid")))
    return "E-mailadressen ser ikke korrekt ud. Tjek formatet, fx navn@eksempel.dk.";
  if (msg.includes("signup") && msg.includes("disabled"))
    return "Oprettelse af nye konti er midlertidigt deaktiveret. Prøv igen senere.";

  if (msg.includes("same_password"))
    return "Vælg en anden adgangskode end den, du bruger nu.";
  if (msg.includes("current password") || msg.includes("current_password"))
    return "Indtast din nuværende adgangskode for at ændre den. Har du glemt den, kan du få et nulstillingslink.";

  // Rate limiting
  if (details.status === 429 || msg.includes("rate limit") || msg.includes("too many requests") || msg.includes("rate_limit") || msg.includes("over_request_rate_limit"))
    return "Der har været for mange forsøg eller mails på kort tid. Vent lidt, før du prøver igen; gentagne klik forlænger ikke adgangen.";

  // OTP / magic link
  if (msg.includes("otp") || msg.includes("token") || msg.includes("expired"))
    return "Linket eller koden er udløbet. Anmod om en ny og prøv igen.";

  // Netværk
  if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("networkerror") || msg.includes("timeout") || msg.includes("fetch failed"))
    return "Kan ikke nå serveren. Tjek din internetforbindelse og prøv igen.";

  // Unknown server errors must not expose internal details or untranslated text.
  return fallback;
}

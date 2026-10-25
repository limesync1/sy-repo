export const PLATFORM_SIGNUP_RECIPIENT = "william@adely.dk";

type SignupEvent = { kind: "business" | "waitlist"; id: string; email?: string | null; name?: string; city?: string | null; cvr?: string | null; role?: string; createdAt?: string };
export function buildPlatformSignupAlert(event: SignupEvent) {
  const business = event.kind === "business";
  const title = business ? "Ny virksomhed på Serviceydere" : "Ny tilmelding til ventelisten";
  const rows = business
    ? [{ label: "Virksomhed", value: event.name || "Ikke oplyst" }, { label: "E-mail", value: event.email || "Ikke oplyst" }, { label: "By", value: event.city || "Ikke oplyst" }, { label: "CVR", value: event.cvr || "Ikke oplyst" }]
    : [{ label: "E-mail", value: event.email || "Ikke oplyst" }, { label: "Interesse", value: event.role === "virksomhed" ? "Virksomhed" : "Kunde" }];
  if (event.createdAt && Number.isFinite(Date.parse(event.createdAt))) {
    rows.push({ label: "Tilmeldt", value: new Intl.DateTimeFormat("da-DK", { timeZone: "Europe/Copenhagen", dateStyle: "long", timeStyle: "short" }).format(new Date(event.createdAt)) });
  }
  return {
    recipient: PLATFORM_SIGNUP_RECIPIENT,
    idempotencyKey: `platform-signup-${event.kind}-${event.id}`,
    templateData: {
      title,
      subject: business ? `${title}: ${event.name || "Ny virksomhed"}` : title,
      intro: business ? "En ny virksomhed er blevet oprettet på serviceydere.dk." : "En person har netop skrevet sig på ventelisten på serviceydere.dk.",
      rows,
      ctaUrl: business ? "https://serviceydere.dk/admin" : "https://serviceydere.dk/admin?tab=waitlist",
      ctaLabel: business ? "Se virksomheder" : "Se ventelisten",
    },
  };
}
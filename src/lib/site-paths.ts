// Klient-side spejl af de gyldige interne stier (se supabase/functions/_shared/valid-links.ts).
// Bruges til at afgøre om et link i en chatbesked kan klikkes som intern rute,
// eller om det skal vises som ren tekst fordi siden ikke findes.

export const VALID_SITE_PATHS: string[] = [
  "/",
  "/virksomheder",
  "/tilbud",
  "/opret-virksomhed",
  "/log-ind",
  "/min-konto",
  "/virksomhed",
  "/virksomhed/ruter",
  "/software",
  "/software/ruteplanlaegger",
  "/software/funktioner",
  "/software/medarbejder-app",
  "/software/booking-og-tilbud",
  "/software/fakturering-og-regnskab",
  "/software/brancher",
  "/software/priser",
  "/software/vinduespudser",
  "/software/rengoering",
  "/software/haveservice",
  "/software/haandvaerker",
  "/hjaelp",
  "/om-os",
  "/anmeldelser",
  "/kontakt",
  "/blog",
  "/guides",
  "/privatlivspolitik",
  "/vilkaar",
  "/cookies",
  "/databehandleraftale",
  "/underdatabehandlere",
];

const VALID_PREFIXES = ["/priser/", "/guides/", "/blog/", "/v/", "/rengoering/", "/flyttehjaelp/", "/haandvaerker/", "/haveservice/"];

export function normalizeSitePath(input: string): string {
  let path = input.trim().replace(/^https?:\/\/(?:www\.)?serviceydere\.dk/i, "");
  path = path.split("#")[0].split("?")[0];
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path.toLowerCase();
}

export function isValidSitePath(input: string): boolean {
  const p = normalizeSitePath(input);
  if (VALID_SITE_PATHS.includes(p)) return true;
  return VALID_PREFIXES.some((prefix) => p.startsWith(prefix) && p.length > prefix.length);
}

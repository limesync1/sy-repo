// Server-side linkvalidering for AI-svar.
//
// AI'en må KUN linke til stier der faktisk findes i appen (se src/App.tsx).
// Alt andet bliver enten rettet via en alias-tabel (typiske forvekslinger som
// sidetitler eller menunavne) eller fjernet, så kunden aldrig får et dødt link.
// Alle rettelser/fjernelser returneres som "issues", så de kan logges.

/** Alle statiske, offentlige stier AI'en må linke til. */
export const VALID_PATHS: string[] = [
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

/** Dynamiske sektioner hvor undersider findes (fx /priser/rengoering). */
const VALID_PREFIXES = ["/priser/", "/guides/", "/blog/", "/v/"];

/**
 * Typiske forvekslinger: menunavne, sidetitler og gamle stier som modellen
 * plejer at finde på. Nøglen er den forkerte sti, værdien den korrekte.
 */
export const PATH_ALIASES: Record<string, string> = {
  "/bliv-udbyder": "/opret-virksomhed",
  "/blivudbyder": "/opret-virksomhed",
  "/bliv-partner": "/opret-virksomhed",
  "/opret": "/opret-virksomhed",
  "/tilmeld": "/opret-virksomhed",
  "/systemet": "/software",
  "/systemet/priser": "/software/priser",
  "/systemet/funktioner": "/software/funktioner",
  "/system": "/software",
  "/priser": "/software/priser",
  "/pris": "/software/priser",
  "/find-services": "/virksomheder",
  "/services": "/virksomheder",
  "/soeg": "/virksomheder",
  "/faa-tilbud": "/tilbud",
  "/faq": "/hjaelp",
  "/hjælp": "/hjaelp",
  "/support": "/kontakt",
  "/dashboard": "/min-konto",
  "/login": "/log-ind",
  "/auth": "/log-ind",
  "/virksomhedspanel": "/virksomhed",
};

export type LinkIssue = {
  raw: string;
  resolved: string | null;
  kind: "alias" | "invalid";
  label?: string;
};

const normalize = (p: string) => {
  let path = p.trim();
  // Fjern evt. absolut host, query og hash — vi arbejder kun med stien.
  path = path.replace(/^https?:\/\/(?:www\.)?serviceydere\.dk/i, "");
  path = path.split("#")[0].split("?")[0];
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path.toLowerCase();
};

/** Er stien en rigtig side i appen? */
export function isValidPath(path: string): boolean {
  const p = normalize(path);
  if (VALID_PATHS.includes(p)) return true;
  return VALID_PREFIXES.some((prefix) => p.startsWith(prefix) && p.length > prefix.length);
}

/**
 * Gennemgår et AI-svar og sikrer at hvert markdown-link peger på en gyldig sti.
 * - Kendt forveksling → rettes automatisk (issue kind "alias").
 * - Ukendt sti → linket erstattes med ren tekst (issue kind "invalid").
 * Eksterne links (mailto:, tel:, andre domæner) røres ikke.
 */
export function sanitizeLinks(
  text: string,
  extraAliases: Record<string, string> = {},
): { text: string; issues: LinkIssue[] } {
  const issues: LinkIssue[] = [];
  // Admin-godkendte aliaser (fra ai_link_aliases) vinder over de statiske,
  // så en forkert sti kan rettes uden en ny deploy.
  const aliases: Record<string, string> = { ...PATH_ALIASES };
  for (const [wrong, correct] of Object.entries(extraAliases)) {
    aliases[normalize(wrong)] = normalize(correct);
  }

  // 1) Markdown-links
  let out = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label: string, href: string) => {
    if (/^(mailto:|tel:)/i.test(href)) return match;
    const isOwnHost = /^https?:\/\/(?:www\.)?serviceydere\.dk/i.test(href);
    if (/^https?:\/\//i.test(href) && !isOwnHost) return match; // eksternt domæne
    const path = normalize(href);
    if (isValidPath(path)) return `[${label}](${path})`;

    const alias = aliases[path];
    if (alias) {
      issues.push({ raw: href, resolved: alias, kind: "alias", label });
      return `[${label}](${alias})`;
    }
    issues.push({ raw: href, resolved: null, kind: "invalid", label });
    return label; // dødt link → ren tekst
  });

  // 2) Rå URL'er / rå stier uden markdown
  out = out.replace(/https?:\/\/(?:www\.)?serviceydere\.dk(\/[^\s)]*)?/gi, (match, path: string) => {
    const p = normalize(path || "/");
    if (isValidPath(p)) return p;
    const alias = aliases[p];
    if (alias) {
      issues.push({ raw: match, resolved: alias, kind: "alias" });
      return alias;
    }
    issues.push({ raw: match, resolved: null, kind: "invalid" });
    return "serviceydere.dk";
  });

  return { text: out, issues };
}

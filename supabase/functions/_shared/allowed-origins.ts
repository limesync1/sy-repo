// Trusted app origins. Used to validate redirect/return URLs and links that
// end up in outbound emails, so callers cannot point them at other sites.
const STATIC_ORIGINS = [
  "https://serviceydere.dk",
  "https://www.serviceydere.dk",
  "https://serviceydere.lovable.app",
  "https://id-preview--3396f095-cb5d-439d-8707-af0033c7fb66.lovable.app",
];
const DEFAULT_ORIGIN = "https://serviceydere.dk";

function isTrustedOrigin(origin: string): boolean {
  if (STATIC_ORIGINS.includes(origin)) return true;
  // Lovable preview hosts for this project only.
  return /^https:\/\/[a-z0-9-]*3396f095-cb5d-439d-8707-af0033c7fb66[a-z0-9-]*\.lovable(project\.com|\.app)$/.test(origin)
    || origin === "http://localhost:8080";
}

/** Returns the request Origin if trusted, otherwise the production origin. */
export function trustedOrigin(req: Request): string {
  const o = (req.headers.get("origin") || "").replace(/\/$/, "");
  return isTrustedOrigin(o) ? o : DEFAULT_ORIGIN;
}

/** True when the URL is absolute and points at one of our own origins. */
export function isTrustedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return isTrustedOrigin(u.origin);
  } catch {
    return false;
  }
}

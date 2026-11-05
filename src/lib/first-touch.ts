/** Husker hvor en besøgende først kom fra (Google, artikel, kampagne),
 *  så nye virksomheder kan kobles til den side der skaffede dem. */
const KEY = "sy_first_touch";

export interface FirstTouch {
  referrer: string | null;
  landing_path: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  at: string;
}

export function buildFirstTouch(href: string, referrer: string, now = new Date()): FirstTouch {
  const url = new URL(href);
  let ref: string | null = null;
  try {
    const r = referrer ? new URL(referrer) : null;
    ref = r && r.host !== url.host ? r.host : null;
  } catch { ref = null; }
  const p = url.searchParams;
  return {
    referrer: ref,
    landing_path: url.pathname,
    utm_source: p.get("utm_source"),
    utm_medium: p.get("utm_medium"),
    utm_campaign: p.get("utm_campaign"),
    at: now.toISOString(),
  };
}

export function captureFirstTouch() {
  try {
    if (localStorage.getItem(KEY)) return;
    localStorage.setItem(KEY, JSON.stringify(buildFirstTouch(window.location.href, document.referrer)));
  } catch { /* blokeret lager */ }
}

export function readFirstTouch(): FirstTouch | null {
  try {
    const v = localStorage.getItem(KEY);
    return v ? (JSON.parse(v) as FirstTouch) : null;
  } catch { return null; }
}

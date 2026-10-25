import { danishIntervalLabel } from "../interval-da.ts";

const fmtDate = (v?: string | null): string | null => {
  if (!v) return null;
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const months = ["jan.", "feb.", "mar.", "apr.", "maj", "jun.", "jul.", "aug.", "sep.", "okt.", "nov.", "dec."];
  return `${Number(m[3])}. ${months[Number(m[2]) - 1]} ${m[1]}`;
};

/**
 * Invoice/order line text: "Service (hver 4. uge) · Udført 24. okt. 2026 · opstart 1. okt. 2026".
 * Presentation only; amounts are unaffected.
 */
export function buildLineDescription(opts: {
  serviceName?: string | null;
  interval?: string | null;
  startDate?: string | null;
  completedDate?: string | null;
}): string {
  const name = (opts.serviceName ?? "").toString().trim() || "Ydelse";
  const iv = danishIntervalLabel(opts.interval ?? null);
  const head = iv ? `${name} (${iv.toLowerCase()})` : name;
  const parts: string[] = [];
  const c = fmtDate(opts.completedDate);
  if (c) parts.push(`Udført ${c}`);
  const s = fmtDate(opts.startDate);
  // Opstart vises kun når den siger noget nyt (ikke samme dag som udført).
  if (s && s !== c) parts.push(`opstart ${s}`);
  const text = parts.length ? `${head} · ${parts.join(" · ")}` : head;
  // e-conomic line descriptions are limited to 2500 chars; Dinero is shorter.
  return text.slice(0, 250);
}

/** Header note: "Udført 24.10.2026 · Aftale #12" plus existing notes. */
export function buildDocumentNote(opts: {
  completedDate?: string | null;
  reference?: string | number | null;
  notes?: string | null;
}): string {
  const parts: string[] = [];
  const c = fmtDate(opts.completedDate);
  if (c) parts.push(`Udført ${c}`);
  if (opts.reference != null && opts.reference !== "") parts.push(`Aftale #${opts.reference}`);
  const head = parts.join(" · ");
  const notes = (opts.notes ?? "").toString().trim();
  return [head, notes].filter(Boolean).join(" — ");
}

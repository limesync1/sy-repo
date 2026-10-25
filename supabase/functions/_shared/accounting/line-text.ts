import { danishIntervalLabel } from "../interval-da.ts";

const fmtDate = (v?: string | null): string | null => {
  if (!v) return null;
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : null;
};

/**
 * Invoice/order line text: "Service — Hver 4. uge · Opstart 01.10.2026 · Udført 24.10.2026".
 * Presentation only; amounts are unaffected.
 */
export function buildLineDescription(opts: {
  serviceName?: string | null;
  interval?: string | null;
  startDate?: string | null;
  completedDate?: string | null;
}): string {
  const name = (opts.serviceName ?? "").toString().trim() || "Ydelse";
  const parts: string[] = [];
  const iv = danishIntervalLabel(opts.interval ?? null);
  if (iv) parts.push(iv);
  const s = fmtDate(opts.startDate);
  if (s) parts.push(`Opstart ${s}`);
  const c = fmtDate(opts.completedDate);
  if (c) parts.push(`Udført ${c}`);
  const text = parts.length ? `${name} — ${parts.join(" · ")}` : name;
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

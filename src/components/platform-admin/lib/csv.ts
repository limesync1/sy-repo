/** Prefix values that spreadsheets would treat as formulas (=, +, -, @, tab, CR). */
export function neutralizeCsvFormula(s: string): string {
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

/** Escape one CSV cell: formula-neutralised, then quoted when needed. */
export function csvCell(v: any, separators = /[",\n;]/): string {
  if (v === null || v === undefined) return "";
  const raw = typeof v === "string" ? v : (v instanceof Date ? v.toISOString() : typeof v === "object" ? JSON.stringify(v) : String(v));
  const s = neutralizeCsvFormula(raw);
  if (separators.test(s) || s !== raw) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// Tiny CSV exporter (RFC4180-ish, Excel-friendly with BOM)
export function exportCsv(filename: string, rows: Record<string, any>[], headers?: string[]) {
  if (!rows.length) return;
  const cols = headers ?? Object.keys(rows[0]);
  const escape = (v: any) => csvCell(v);
  const csv = [
    cols.join(";"),
    ...rows.map((r) => cols.map((c) => escape(r[c])).join(";")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

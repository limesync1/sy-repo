// Tiny CSV exporter (RFC4180-ish, Excel-friendly with BOM)
export function exportCsv(filename: string, rows: Record<string, any>[], headers?: string[]) {
  if (!rows.length) return;
  const cols = headers ?? Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "string" ? v : (v instanceof Date ? v.toISOString() : String(v));
    if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
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

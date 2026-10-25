// Fakturainterval: hvor ofte udførte besøg samles på én faktura pr. kunde.
// Spejler SQL-funktionen public.invoice_period_end, så panelet viser samme datoer som serveren.
export type InvoiceInterval = "per_visit" | "every_14_days" | "monthly" | "quarterly" | "custom";
export type IntervalUnit = "day" | "week" | "month";
export type InvoiceIntervalValue = { interval: InvoiceInterval | null; count: number | null; unit: IntervalUnit | null };

export const INVOICE_INTERVAL_OPTIONS: { value: InvoiceInterval; label: string; hint: string }[] = [
  { value: "per_visit", label: "Efter hvert besøg", hint: "Én faktura pr. udført besøg" },
  { value: "every_14_days", label: "Hver 14. dag", hint: "Besøg samles i 14 dage" },
  { value: "monthly", label: "Månedligt", hint: "Én faktura ved månedens udgang" },
  { value: "quarterly", label: "Kvartalsvis", hint: "Én faktura ved kvartalets udgang" },
  { value: "custom", label: "Brugerdefineret", hint: "Vælg selv antal dage, uger eller måneder" },
];

export const UNIT_LABEL: Record<IntervalUnit, [string, string]> = {
  day: ["dag", "dage"], week: ["uge", "uger"], month: ["måned", "måneder"],
};

export function describeInvoiceInterval(v: InvoiceIntervalValue | null | undefined): string {
  if (!v?.interval) return "Standard";
  if (v.interval !== "custom") return INVOICE_INTERVAL_OPTIONS.find((o) => o.value === v.interval)?.label ?? "Standard";
  const n = Math.max(1, v.count ?? 1);
  const [one] = UNIT_LABEL[v.unit ?? "day"];
  return n === 1 ? `Hver ${one}` : `Hver ${n}. ${one}`;
}

const pad = (n: number) => String(n).padStart(2, "0");
/** Null preserves live customer/business inheritance instead of copying a default. */
export function invoiceIntervalOrderFields(value: InvoiceIntervalValue, accountingActive: boolean) {
  const interval = accountingActive ? value.interval : null;
  return {
    invoice_interval: interval,
    invoice_interval_count: interval === "custom" ? value.count : null,
    invoice_interval_unit: interval === "custom" ? value.unit : null,
  };
}

const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Sidste dag i perioden der starter `start` (YYYY-MM-DD). */
export function invoicePeriodEnd(start: string, v: InvoiceIntervalValue): string {
  const [y, m, d] = start.split("-").map(Number);
  const s = new Date(y, m - 1, d);
  switch (v.interval) {
    case "monthly": return iso(new Date(y, m, 0));
    case "quarterly": { const qEnd = Math.floor((m - 1) / 3) * 3 + 3; return iso(new Date(y, qEnd, 0)); }
    case "every_14_days": return iso(new Date(y, m - 1, d + 13));
    case "custom": {
      const n = Math.max(1, v.count ?? 1);
      if (v.unit === "week") return iso(new Date(y, m - 1, d + n * 7 - 1));
      if (v.unit === "month") return iso(new Date(y, m - 1 + n, d - 1));
      return iso(new Date(y, m - 1, d + n - 1));
    }
    default: return iso(s);
  }
}

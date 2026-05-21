export const STATUS_OPTIONS = [
  { value: "pending", label: "Afventer" },
  { value: "confirmed", label: "Bekræftet" },
  { value: "in_progress", label: "I gang" },
  { value: "completed", label: "Afsluttet" },
  { value: "cancelled", label: "Annulleret" },
];

export const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  confirmed: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  in_progress: "bg-violet-500/10 text-violet-700 border-violet-500/20",
  completed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  cancelled: "bg-red-500/10 text-red-700 border-red-500/20",
};

export const SORT_OPTIONS = [
  { v: "newest", label: "Nyeste først" },
  { v: "oldest", label: "Ældste først" },
  { v: "amount_desc", label: "Højeste beløb" },
  { v: "amount_asc", label: "Laveste beløb" },
  { v: "due_asc", label: "Forfald snart" },
  { v: "customer", label: "Kunde (A–Å)" },
];

export const PAGE_SIZE = 50;
export const VIEWS_KEY = "admin_orders_saved_views";

export type SavedView = { name: string; q: string; status: string; quickFilter: string; sort: string };

export const fmtKr = (n: number) => `${Number(n).toLocaleString("da-DK")} kr`;

export const buildChips = (counts: Record<string, number>) => [
  { v: "all", label: "Alle" },
  { v: "today", label: `I dag${counts.today ? ` (${counts.today})` : ""}` },
  { v: "week", label: `Denne uge${counts.week ? ` (${counts.week})` : ""}` },
  { v: "overdue", label: `Forfaldne${counts.overdue ? ` (${counts.overdue})` : ""}` },
  { v: "unpaid", label: `Ubetalte${counts.unpaid ? ` (${counts.unpaid})` : ""}` },
  { v: "unpaid7", label: `Ubetalte >7d${counts.unpaid7 ? ` (${counts.unpaid7})` : ""}` },
  { v: "credited", label: `Kreditnota${counts.credited ? ` (${counts.credited})` : ""}` },
];
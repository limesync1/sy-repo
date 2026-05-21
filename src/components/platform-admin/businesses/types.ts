export const PAGE_SIZE = 50;

export type FilterKey =
  | "all" | "active_paying" | "trial" | "trial_expiring"
  | "expired_no_card" | "inactive" | "unverified" | "no_orders" | "no_login";

export type SortKey =
  | "created_desc" | "created_asc" | "revenue_desc" | "orders_desc"
  | "last_order_desc" | "last_login_desc" | "name_asc";

export type SavedView = { id: string; name: string; q: string; filter: FilterKey; sort: SortKey };

const SAVED_VIEWS_KEY = "admin.businesses.savedViews.v1";
export const loadViews = (): SavedView[] => {
  try { return JSON.parse(localStorage.getItem(SAVED_VIEWS_KEY) || "[]"); } catch { return []; }
};
export const saveViews = (v: SavedView[]) => localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(v));

export const fmtKr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr`;

export const fmtRelDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const day = 86400000;
  if (diff < day) return "i dag";
  if (diff < 2 * day) return "i går";
  if (diff < 30 * day) return `${Math.floor(diff / day)}d siden`;
  if (diff < 365 * day) return `${Math.floor(diff / (30 * day))}m siden`;
  return `${Math.floor(diff / (365 * day))}å siden`;
};

export type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  city: string | null;
  email: string | null;
  owner_email?: string | null;
  logo_url?: string | null;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  orders_count?: number;
  total_revenue?: number;
  pending_count?: number;
  owner_last_login?: string | null;
  last_order_at?: string | null;
  plan_status?: string | null;
  days_left?: number | null;
  monthly_price_dkk?: number;
  stripe_payment_method_brand?: string | null;
  stripe_payment_method_last4?: string | null;
};

export const SORT_OPTIONS: Array<[SortKey, string]> = [
  ["created_desc", "Nyeste først"],
  ["created_asc", "Ældste først"],
  ["revenue_desc", "Højeste omsætning"],
  ["orders_desc", "Flest ordrer"],
  ["last_order_desc", "Senest aktive (ordre)"],
  ["last_login_desc", "Senest logget ind"],
  ["name_asc", "Navn A→Z"],
];

export type FilterChip = { v: FilterKey; label: string; count: number; tone: "default" | "success" | "warning" | "danger" };

export const buildChips = (counts: Record<string, number>): FilterChip[] => [
  { v: "all", label: "Alle", count: counts.all_n ?? 0, tone: "default" },
  { v: "active_paying", label: "Aktive (betalende)", count: counts.active_paying ?? 0, tone: "success" },
  { v: "trial", label: "På prøve", count: counts.trial ?? 0, tone: "default" },
  { v: "trial_expiring", label: "Prøve udløber ≤3d", count: counts.trial_expiring ?? 0, tone: "warning" },
  { v: "expired_no_card", label: "Prøve udløbet · intet kort", count: counts.expired_no_card ?? 0, tone: "danger" },
  { v: "inactive", label: "Inaktive", count: counts.inactive ?? 0, tone: "default" },
  { v: "unverified", label: "Ikke verificeret", count: counts.unverified ?? 0, tone: "default" },
  { v: "no_orders", label: "Ingen ordrer", count: counts.no_orders ?? 0, tone: "default" },
  { v: "no_login", label: "Aldrig logget ind", count: counts.no_login ?? 0, tone: "warning" },
];
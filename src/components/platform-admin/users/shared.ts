export interface AdminUser {
  user_id: string;
  email: string | null;
  auth_created_at: string;
  last_sign_in_at: string | null;
  display_name: string | null;
  phone: string | null;
  roles: string[];
  orders_count: number;
  businesses_count: number;
}

export const PAGE_SIZE = 50;
export type ActivityFilter = "all" | "active_7" | "never_login" | "inactive_30" | "inactive_90" | "no_orders";
export type SortKey = "created_desc" | "created_asc" | "last_login_desc" | "orders_desc" | "email_asc";

export const SORT_LABELS: [SortKey, string][] = [
  ["created_desc", "Nyeste først"],
  ["created_asc", "Ældste først"],
  ["last_login_desc", "Senest logget ind"],
  ["orders_desc", "Flest ordrer"],
  ["email_asc", "E-mail A→Z"],
];

export const roleColor = (role: string) =>
  role === "admin" ? "bg-accent/15 text-accent border-accent/30" :
  role === "business_owner" ? "bg-violet-500/10 text-violet-700 border-violet-500/20" :
  "bg-secondary text-muted-foreground border-border";

export const loginStatus = (iso: string | null) => {
  if (!iso) return { label: "Aldrig logget ind", tone: "bg-muted text-muted-foreground" };
  const days = (Date.now() - new Date(iso).getTime()) / 86400000;
  if (days < 1) return { label: "Aktiv i dag", tone: "bg-success/10 text-success" };
  if (days < 7) return { label: `Sidst for ${Math.round(days)} dage siden`, tone: "bg-success/10 text-success" };
  if (days < 30) return { label: `Sidst for ${Math.round(days)} dage siden`, tone: "bg-secondary text-foreground" };
  return { label: `Inaktiv i ${Math.round(days / 30)} mdr.`, tone: "bg-amber-500/10 text-amber-700" };
};

export const ACTIVITY_CHIPS = [
  { v: "all" as ActivityFilter, label: "Alle", key: "all_n", tone: "default" },
  { v: "active_7" as ActivityFilter, label: "Aktive ≤7d", key: "active_7", tone: "success" },
  { v: "never_login" as ActivityFilter, label: "Aldrig logget ind", key: "never_login", tone: "warning" },
  { v: "inactive_30" as ActivityFilter, label: "Inaktive >30d", key: "inactive_30", tone: "warning" },
  { v: "inactive_90" as ActivityFilter, label: "Inaktive >90d", key: "inactive_90", tone: "danger" },
  { v: "no_orders" as ActivityFilter, label: "Ingen ordrer", key: "no_orders", tone: "default" },
] as const;
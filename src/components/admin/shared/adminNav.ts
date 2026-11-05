// adminNav — ÉN sandhed for virksomhedspanelets navigation.
// Ren data + små rene funktioner (ingen hooks), så den kan enhedstestes og
// bruges af både sidebar, drawer og bundnavigation.
import {
  LayoutDashboard, Wrench, Star, Sparkles, MessageCircle, Rocket, Briefcase,
  CalendarDays, Users, Route, ReceiptText, Settings, type LucideIcon,
} from "lucide-react";

export const ADMIN_TAB_KEYS = [
  "getting-started", "dashboard", "services", "orders", "customers",
  "routes", "employees", "reviews", "leads", "livechat", "accounting", "settings",
] as const;
export type AdminTabKey = (typeof ADMIN_TAB_KEYS)[number];

export type AdminFeatureFlags = {
  /** Fuldt system (aftaler, kunder, ruter m.m.). Falsk for "Kun profil". */
  operations: boolean;
  routePlanning: boolean;
  leads: boolean;
  livechat: boolean;
  accounting: boolean;
};

export type AdminNavGroupKey = "onboarding" | "drift" | "virksomhed" | "system";

export type AdminNavItem = {
  value: AdminTabKey;
  label: string;
  icon: LucideIcon;
  group: AdminNavGroupKey;
  /** Hvis sat: navigér til denne route i stedet for intern tab-state. */
  href?: string;
  /** Skjules medmindre featuren er slået til i virksomhedens indstillinger. */
  requires?: keyof AdminFeatureFlags;
};

/** Grupper i den rækkefølge de vises. label=null → kun en tynd skillelinje. */
export const ADMIN_NAV_GROUPS: { key: Exclude<AdminNavGroupKey, "onboarding">; label: string | null }[] = [
  { key: "drift", label: "Hverdagen" },
  { key: "virksomhed", label: "Min virksomhed" },
  { key: "system", label: null },
];

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { value: "getting-started", label: "Kom godt i gang", icon: Rocket, group: "onboarding" },

  { value: "dashboard", label: "Overblik", icon: LayoutDashboard, group: "drift" },
  { value: "orders", label: "Aftaler", icon: CalendarDays, group: "drift", requires: "operations" },
  { value: "routes", label: "Ruter", icon: Route, group: "drift", requires: "routePlanning", href: "/virksomhed/ruter" },
  { value: "customers", label: "Kunder", icon: Users, group: "drift", requires: "operations" },
  { value: "leads", label: "Forespørgsler", icon: Sparkles, group: "drift", requires: "leads" },

  { value: "services", label: "Services", icon: Wrench, group: "virksomhed" },
  { value: "employees", label: "Medarbejdere", icon: Briefcase, group: "virksomhed", requires: "routePlanning" },
  { value: "reviews", label: "Anmeldelser", icon: Star, group: "virksomhed" },
  { value: "livechat", label: "Livechat", icon: MessageCircle, group: "virksomhed", requires: "livechat" },
  { value: "accounting", label: "Regnskab", icon: ReceiptText, group: "virksomhed", requires: "accounting" },

  { value: "settings", label: "Indstillinger", icon: Settings, group: "system" },
];

export const findAdminNavItem = (key: AdminTabKey) => ADMIN_NAV_ITEMS.find((n) => n.value === key);

export const isAdminNavVisible = (item: AdminNavItem, flags: AdminFeatureFlags) =>
  !item.requires || !!flags[item.requires];

/** De fire faner der vises direkte i mobilens bundnavigation. */
export const adminMobilePrimaryKeys = (flags: AdminFeatureFlags): AdminTabKey[] => !flags.operations
  ? ["dashboard", "services", "reviews", "settings"]
  : [
  "dashboard",
  "orders",
  flags.routePlanning ? "routes" : "services",
  "customers",
];

/**
 * Prefetch af hver fane. Vi importerer dynamisk når brugeren hover'er/fokuserer
 * en fane — så er bundle ofte klar inden klik, og fane-skift føles øjeblikkeligt.
 */
export const TAB_PREFETCH: Record<AdminTabKey, () => Promise<unknown>> = {
  "getting-started": () => import("@/components/admin/onboarding/GettingStartedTab"),
  dashboard: () => import("@/components/admin/DashboardTab"),
  services: () => import("@/components/admin/ServicesTab"),
  orders: () => import("@/components/admin/AftaleTab"),
  customers: () => import("@/components/admin/CustomersTab"),
  employees: () => import("@/components/admin/EmployeesTab"),
  reviews: () => import("@/components/admin/ReviewsTab"),
  leads: () => import("@/components/admin/LeadsTab"),
  livechat: () => import("@/components/admin/BusinessLiveChatTab"),
  settings: () => import("@/components/admin/SettingsTab"),
  routes: () => import("@/pages/RoutePlanner"),
  accounting: () => import("@/components/admin/AccountingTab"),
};

const prefetched = new Set<AdminTabKey>();
export const prefetchAdminTab = (key: AdminTabKey) => {
  if (prefetched.has(key)) return;
  prefetched.add(key);
  TAB_PREFETCH[key]?.().catch(() => prefetched.delete(key));
};

/** Nabo-faner der prefetches først (hurtigt), resten bagefter (idle). */
export const adminNeighbours = (active: AdminTabKey): AdminTabKey[] =>
  active === "dashboard" ? ["orders", "customers"]
  : active === "orders" ? ["dashboard", "customers"]
  : ["dashboard", "orders"];

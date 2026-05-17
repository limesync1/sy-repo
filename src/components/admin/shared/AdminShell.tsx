// AdminShell — delt sidebar + topbar shell der bruges af både Admin-panelet
// (Overblik, Services, Aftaler, Kunder, Medarbejdere, Anmeldelser, Indstillinger)
// OG Ruteplanlæggeren, så de har præcis samme visuelle sprog.
//
// Brug:
//   <AdminShell business={business} activeTab="routes" topbarRight={...} contentPadding={false}>
//     <din side her />
//   </AdminShell>
//
// Sidebar-items er definitive — det matcher NAV_ITEMS i Admin.tsx.
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  LogOut, LayoutDashboard, Wrench, ShoppingCart, Star, Settings,
  Menu, X, ExternalLink, Users, Route as RouteIcon, Contact, Sparkles, MessageCircle, Calculator, Upload, LifeBuoy,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useBusinessPlan } from "@/hooks/useBusinessPlan";

export type AdminTabKey =
  | "dashboard" | "services" | "orders" | "customers"
  | "routes" | "employees" | "reviews" | "leads" | "livechat" | "accounting" | "dataimport" | "settings";

/**
 * Animeret sidebar-item: collapser stille ind/ud når en feature toggles
 * til/fra i Indstillinger. Bevidst minimal — kun height + opacity.
 * Ingen rotation, blur, scale eller pulse: det forvirrede brugeren fordi
 * det signalerede "noget vigtigt skete" hver gang en menu blev hentet.
 */
const AnimatedNavItem = ({
  visible, isActive, item, onClick, onPrefetch,
}: {
  visible: boolean;
  isActive: boolean;
  item: NavItem;
  onClick: () => void;
  onPrefetch: () => void;
}) => {
  const [shouldRender, setShouldRender] = useState(visible);
  const [open, setOpen] = useState(visible);
  const firstRender = useRef(true);

  // Standard ease-out — samme tempo som resten af UI'et (popovers, dialoger).
  const easing = "cubic-bezier(0.22, 1, 0.36, 1)";

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      setShouldRender(visible);
      setOpen(visible);
      return;
    }
    if (visible) {
      setShouldRender(true);
      // To frames forsinkelse så DOM'en når at montere i lukket tilstand,
      // og transitionen kan køre fra start til mål.
      let id2 = 0;
      const id1 = requestAnimationFrame(() => {
        id2 = requestAnimationFrame(() => {
          setOpen(true);
        });
      });
      return () => {
        cancelAnimationFrame(id1);
        if (id2) cancelAnimationFrame(id2);
      };
    } else {
      setOpen(false);
      const t = setTimeout(() => setShouldRender(false), 220);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!shouldRender) return null;

  return (
    <div
      style={{
        transitionTimingFunction: easing,
        transitionDuration: "200ms",
        transitionProperty: "grid-template-rows, opacity, margin",
      }}
      className={cn(
        "grid",
        open
          ? "grid-rows-[1fr] opacity-100 mt-1 first:mt-0"
          : "grid-rows-[0fr] opacity-0 mt-0",
      )}
    >
      <div className={cn(open ? "overflow-visible" : "overflow-hidden")}>
        <button
          onClick={onClick}
          onMouseEnter={onPrefetch}
          onFocus={onPrefetch}
          onTouchStart={onPrefetch}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-left",
            "transition-colors duration-150 ease-out",
            isActive
              ? "bg-secondary text-foreground shadow-sm ring-1 ring-border"
              : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span>{item.label}</span>
        </button>
      </div>
    </div>
  );
};

/**
 * Prefetch-funktioner for hver fane. Vi importerer dynamisk når brugeren
 * hover'er over en fane — så er bundle og data ofte klar inden klik, og
 * fane-skift føles øjeblikkeligt i stedet for at vise "Indlæser…".
 */
const TAB_PREFETCH: Partial<Record<AdminTabKey, () => Promise<unknown>>> = {
  dashboard: () => import("@/components/admin/DashboardTab"),
  services:  () => import("@/pages/Admin"),
  orders:    () => import("@/components/admin/AftaleTab"),
  customers: () => import("@/components/admin/CustomersTab"),
  employees: () => import("@/components/admin/EmployeesTab"),
  reviews:   () => import("@/components/admin/ReviewsTab"),
  leads:     () => import("@/components/admin/LeadsTab"),
  livechat:  () => import("@/components/admin/BusinessLiveChatTab"),
  settings:  () => import("@/components/admin/SettingsTab"),
  routes:    () => import("@/pages/RoutePlanner"),
  accounting: () => import("@/components/admin/AccountingTab"),
};
TAB_PREFETCH.dataimport = () => import("@/components/admin/DataImportTab");
const prefetched = new Set<AdminTabKey>();
const prefetchTab = (key: AdminTabKey) => {
  if (prefetched.has(key)) return;
  prefetched.add(key);
  TAB_PREFETCH[key]?.().catch(() => prefetched.delete(key));
};

type NavItem = {
  value: AdminTabKey;
  label: string;
  icon: any;
  href?: string;
  requiresRoutePlanning?: boolean;
  requiresLeads?: boolean;
  requiresLivechat?: boolean;
  requiresAccounting?: boolean;
  requiresDataImport?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { value: "dashboard", label: "Overblik", icon: LayoutDashboard },
  { value: "services", label: "Services", icon: Wrench },
  { value: "orders", label: "Aftaler", icon: ShoppingCart },
  { value: "leads", label: "Leads", icon: Sparkles, requiresLeads: true },
  { value: "customers", label: "Kunder", icon: Contact },
  { value: "routes", label: "Ruter", icon: RouteIcon, requiresRoutePlanning: true, href: "/virksomhed/ruter" },
  { value: "employees", label: "Medarbejdere", icon: Users, requiresRoutePlanning: true },
  { value: "reviews", label: "Anmeldelser", icon: Star },
  { value: "livechat", label: "Livechat", icon: MessageCircle, requiresLivechat: true },
  { value: "accounting", label: "Regnskab", icon: Calculator, requiresAccounting: true },
  { value: "dataimport", label: "Dataimport", icon: Upload, requiresDataImport: true },
  { value: "settings", label: "Indstillinger", icon: Settings },
];

type Business = {
  id?: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  categories?: string[] | null;
  settings?: any;
};

type AdminShellProps = {
  business: Business;
  /** Aktiv fane — fremhæves i sidebar. */
  activeTab: AdminTabKey;
  /** Kaldes når en fane uden href klikkes (kun relevant for Admin.tsx der har intern tab-state). */
  onTabChange?: (tab: AdminTabKey) => void;
  /** Tekst i topbar (hvis ikke sat → bruges label fra aktive nav-item). */
  title?: ReactNode;
  /** Indhold i højre side af topbar (knapper, dato-nav osv.). */
  topbarRight?: ReactNode;
  /** Sat til false hvis siden selv styrer padding (fx ruteplanlægger der bruger fuld bredde). */
  contentPadding?: boolean;
  /** Ekstra klasser på <main>. */
  contentClassName?: string;
  children: ReactNode;
};

export const AdminShell = ({
  business, activeTab, onTabChange, title, topbarRight,
  contentPadding = true, contentClassName, children,
}: AdminShellProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: plan } = useBusinessPlan(business.id);

  // Idle-prefetch — varm de mest brugte faner op i baggrunden så snart
  // browseren har et roligt øjeblik. Det betyder at det første klik på
  // fx "Aftaler" eller "Kunder" føles instant uden Suspense-skeleton.
  useEffect(() => {
    const keys: AdminTabKey[] = [
      "dashboard", "services", "orders", "customers",
      "employees", "reviews", "settings",
    ];
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    const trigger = () => keys.forEach((k) => prefetchTab(k));
    const id = ric ? ric(trigger, { timeout: 2500 }) : window.setTimeout(trigger, 1800);
    return () => {
      if (ric && (window as any).cancelIdleCallback) (window as any).cancelIdleCallback(id);
      else window.clearTimeout(id as number);
    };
  }, []);

  const routePlanningEnabled = !!(business.settings as any)?.route_planning_enabled;
  const leadsEnabled = !!(business.settings as any)?.leads_enabled;
  const livechatEnabled = !!(business.settings as any)?.livechat_enabled;
  const accountingEnabled = !!(business.settings as any)?.accounting_integration_enabled;
  const dataImportEnabled = !!plan?.data_import_requested;
  const visibleNav = NAV_ITEMS.filter((n) => {
    if (n.requiresRoutePlanning && !routePlanningEnabled) return false;
    if (n.requiresLeads && !leadsEnabled) return false;
    if (n.requiresLivechat && !livechatEnabled) return false;
    if (n.requiresAccounting && !accountingEnabled) return false;
    if ((n as any).requiresDataImport && !dataImportEnabled) return false;
    return true;
  });
  const currentNav = visibleNav.find((n) => n.value === activeTab) ?? NAV_ITEMS.find((n) => n.value === activeTab);

  const handleNavClick = (item: NavItem) => {
    setSidebarOpen(false);
    if (item.href) {
      navigate(item.href);
      return;
    }
    // For tab-items uden href (intern Admin tab-state)
    if (onTabChange) {
      onTabChange(item.value);
    } else {
      // Hvis vi er på en anden side end /virksomhed (fx /virksomhed/ruter), så naviger hjem
      // til admin-panelet og lad det vise den valgte fane via query/hash.
      navigate(`/virksomhed?tab=${item.value}`);
    }
  };

  return (
    <div className="flex min-h-screen bg-secondary/50">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-border bg-background transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/serviceydere-logo-dark.webp"
              alt="Serviceydere"
              className="h-7 w-auto"
              width={1920}
              height={539}
              decoding="async"
              fetchPriority="high"
             loading="lazy"/>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
            aria-label="Luk menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Business info */}
        <div className="mx-3 mt-3 mb-3 shrink-0 rounded-xl border border-border bg-card px-3 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt=""
                className="h-9 w-9 shrink-0 rounded-lg border border-border object-contain bg-background p-1"
                width="36"
                height="36"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground font-bold text-sm">
                {business.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{business.name}</p>
              {business.categories && business.categories.length > 0 && (
                <p className="truncate text-xs text-muted-foreground">{(business.categories as string[]).join(", ")}</p>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 pt-1 pb-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const visible =
              !(item.requiresRoutePlanning && !routePlanningEnabled) &&
              !(item.requiresLeads && !leadsEnabled) &&
              !(item.requiresLivechat && !livechatEnabled) &&
              !(item.requiresAccounting && !accountingEnabled) &&
              !((item as any).requiresDataImport && !dataImportEnabled);
            return (
              <AnimatedNavItem
                key={item.value}
                visible={visible}
                isActive={activeTab === item.value}
                item={item}
                onClick={() => handleNavClick(item)}
                onPrefetch={() => prefetchTab(item.value)}
              />
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-border px-3 py-3 space-y-1">
          <Link
            to={`/v/${business.slug}`}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            Se din side
          </Link>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Log ud
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-5 sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors lg:hidden"
            aria-label="Åbn menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground truncate">
            {title ?? currentNav?.label}
          </h1>
          <div className="ml-auto flex items-center gap-2 min-w-0">
            {topbarRight}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("serviceydere:open-platform-chat"))}
              title="Kontakt Serviceydere kundeservice"
              aria-label="Kontakt Serviceydere kundeservice"
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-2 text-xs font-semibold text-background shadow-[0_14px_32px_-14px_hsl(var(--foreground)/0.55)] transition-all hover:bg-foreground/90 hover:shadow-[0_18px_40px_-14px_hsl(var(--foreground)/0.6)] active:scale-95"
            >
              <span className="relative flex h-5 w-5 items-center justify-center">
                <img
                  src="/serviceydere-ikon.webp"
                  alt=""
                  aria-hidden="true"
                  className="h-5 w-5 rounded-full object-cover"
                />
                <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/70 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success ring-2 ring-foreground"></span>
                </span>
              </span>
              <span className="hidden sm:inline">Kundeservice</span>
            </button>
          </div>
        </header>

        <main
          className={cn(
            "flex-1 min-w-0",
            contentPadding ? "p-4 sm:p-6" : "",
            contentClassName,
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminShell;
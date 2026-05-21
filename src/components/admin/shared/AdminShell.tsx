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
  Menu, X, ExternalLink, Users, Route as RouteIcon, Contact, Sparkles, MessageCircle, Calculator, Upload, LifeBuoy, Truck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useBusinessPlan } from "@/hooks/useBusinessPlan";
import { useEmployees } from "@/hooks/useEmployees";
import { useMyEmployee } from "@/hooks/useMyEmployee";
import {
  SidebarNavButton, SidebarFooterItem,
  SIDEBAR_WIDTH_EXPANDED,
} from "@/components/shared/sidebar/SidebarParts";

export type AdminTabKey =
  | "dashboard" | "services" | "orders" | "customers"
  | "routes" | "employees" | "reviews" | "leads" | "livechat" | "accounting" | "settings";

/**
 * Animeret sidebar-item: collapser stille ind/ud når en feature toggles
 * til/fra i Indstillinger. Bevidst minimal — kun height + opacity.
 * Ingen rotation, blur, scale eller pulse: det forvirrede brugeren fordi
 * det signalerede "noget vigtigt skete" hver gang en menu blev hentet.
 */
const AnimatedNavItem = ({
  visible, isActive, item, onClick, onPrefetch, collapsed,
}: {
  visible: boolean;
  isActive: boolean;
  item: NavItem;
  onClick: () => void;
  onPrefetch: () => void;
  collapsed: boolean;
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
        <SidebarNavButton
          icon={item.icon}
          label={item.label}
          active={isActive}
          collapsed={collapsed}
          onClick={onClick}
          onMouseEnter={onPrefetch}
          onFocus={onPrefetch}
          onTouchStart={onPrefetch}
        />
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
  services:  () => import("@/components/admin/ServicesTab"),
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
  void plan;
  // Genvej til medarbejder-appen: Vises kun når virksomheden har præcis
  // én medarbejder OG den medarbejder er den indloggede ejer selv. Så kan
  // ejeren med ét klik hoppe fra ruteplanlægning over i medarbejder-appen
  // og udføre opgaverne uden at gå via det globale panel-switcher-menupunkt.
  const { data: employees } = useEmployees(business.id);
  const { data: myEmployee } = useMyEmployee();
  const isSoloOwnerEmployee =
    !!myEmployee &&
    Array.isArray(employees) &&
    employees.length === 1 &&
    employees[0]?.id === myEmployee.id;
  const collapsed = false;
  const sidebarPx = SIDEBAR_WIDTH_EXPANDED;

  // ESC lukker mobil-sidebar — letter tastatur-navigation.
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSidebarOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  // Idle-prefetch — kun den AKTUELLE fanes nabo-faner (dashboard + orders) i
  // stedet for alle 8. Tidligere prefetch af AftaleTab (122KB) + SettingsTab
  // (110KB) trak ~250KB ned ved hver mount og blokerede main-thread. Resten
  // hentes on-hover via AnimatedNavItem's onPrefetch.
  useEffect(() => {
    const neighbours: AdminTabKey[] =
      activeTab === "dashboard" ? ["orders", "customers"]
      : activeTab === "orders" ? ["dashboard", "customers"]
      : ["dashboard", "orders"];
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    const trigger = () => neighbours.forEach((k) => prefetchTab(k));
    const id = ric ? ric(trigger, { timeout: 3000 }) : window.setTimeout(trigger, 2500);
    return () => {
      if (ric && (window as any).cancelIdleCallback) (window as any).cancelIdleCallback(id);
      else window.clearTimeout(id as number);
    };
  }, [activeTab]);

  const routePlanningEnabled = !!(business.settings as any)?.route_planning_enabled;
  const leadsEnabled = !!(business.settings as any)?.leads_enabled;
  const livechatEnabled = !!(business.settings as any)?.livechat_enabled;
  const accountingEnabled = !!(business.settings as any)?.accounting_integration_enabled;
  const visibleNav = NAV_ITEMS.filter((n) => {
    if (n.requiresRoutePlanning && !routePlanningEnabled) return false;
    if (n.requiresLeads && !leadsEnabled) return false;
    if (n.requiresLivechat && !livechatEnabled) return false;
    if (n.requiresAccounting && !accountingEnabled) return false;
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
    <div className="flex min-h-dvh bg-secondary/50">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        style={{ width: `${sidebarPx}px` }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-background transition-[transform,width] duration-200 lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Hovednavigation"
      >
        <div className={cn("flex h-14 shrink-0 items-center justify-between border-b border-border", collapsed ? "px-2" : "px-4")}>
          <Link to="/" className="flex items-center gap-2 overflow-hidden" aria-label="Forside">
            <img
              src="/serviceydere-logo-dark.webp"
              alt="Serviceydere"
              className={cn("w-auto", collapsed ? "h-8" : "h-9")}
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
        <div
          className={cn(
            "mt-3 mb-3 shrink-0 rounded-xl border border-border bg-card shadow-sm",
            collapsed ? "mx-2 px-2 py-2" : "mx-3 px-3 py-3",
          )}
          title={collapsed ? business.name : undefined}
        >
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
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{business.name}</p>
                {business.categories && business.categories.length > 0 && (
                  <p className="truncate text-xs text-muted-foreground">{(business.categories as string[]).join(", ")}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <nav className={cn("flex-1 pt-1 pb-2 overflow-y-auto", collapsed ? "px-2" : "px-3")}>
          {NAV_ITEMS.map((item) => {
            const visible =
              !(item.requiresRoutePlanning && !routePlanningEnabled) &&
              !(item.requiresLeads && !leadsEnabled) &&
              !(item.requiresLivechat && !livechatEnabled) &&
              !(item.requiresAccounting && !accountingEnabled);
            return (
              <AnimatedNavItem
                key={item.value}
                visible={visible}
                isActive={activeTab === item.value}
                item={item}
                onClick={() => handleNavClick(item)}
                onPrefetch={() => prefetchTab(item.value)}
                collapsed={collapsed}
              />
            );
          })}
        </nav>

        <div className={cn("shrink-0 space-y-1 border-t border-border py-3", collapsed ? "px-2" : "px-3")}>
          <SidebarFooterItem icon={ExternalLink} label="Se din side" href={`/v/${business.slug}`} collapsed={collapsed} />
          <SidebarFooterItem icon={LogOut} label="Log ud" onClick={signOut} collapsed={collapsed} danger />
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
                  className="h-7 w-7 rounded-full object-cover"
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
          <ImpersonationBanner />
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminShell;

/* ImpersonationBanner — vises kun når en platform-admin har indløst en
   5-cifret kode og browser-fanen kører i "log ind som virksomhed"-tilstand.
   Klik på "Stop" fjerner sessionen og genindlæser panelet med admins egen
   virksomhed (eller forsiden hvis admin ikke selv har en virksomhed). */
const ImpersonationBanner = () => {
  if (typeof window === "undefined") return null;
  // Læses ved hvert render — sessionStorage er en ren synkron getter
  const id = (() => { try { return window.sessionStorage.getItem("sy.impersonate.business_id"); } catch { return null; } })();
  if (!id) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
        <span><strong>Platform-admin</strong> · Du ser denne virksomheds panel via en impersonation-kode.</span>
      </div>
      <button
        type="button"
        className="rounded-md bg-foreground/90 px-3 py-1.5 text-xs font-semibold text-background hover:bg-foreground"
        onClick={() => {
          try { window.sessionStorage.removeItem("sy.impersonate.business_id"); } catch { /* noop */ }
          window.location.href = "/admin";
        }}
      >
        Stop og gå tilbage
      </button>
    </div>
  );
};
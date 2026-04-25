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
import { useState, type ReactNode } from "react";
import {
  LogOut, LayoutDashboard, Wrench, ShoppingCart, Star, Settings,
  Menu, X, ExternalLink, Users, Route as RouteIcon, Contact,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export type AdminTabKey =
  | "dashboard" | "services" | "orders" | "customers"
  | "routes" | "employees" | "reviews" | "settings";

type NavItem = {
  value: AdminTabKey;
  label: string;
  icon: any;
  href?: string;
  requiresRoutePlanning?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { value: "dashboard", label: "Overblik", icon: LayoutDashboard },
  { value: "services", label: "Services", icon: Wrench },
  { value: "orders", label: "Aftaler", icon: ShoppingCart },
  { value: "customers", label: "Kunder", icon: Contact },
  { value: "routes", label: "Ruter", icon: RouteIcon, requiresRoutePlanning: true, href: "/virksomhed/ruter" },
  { value: "employees", label: "Medarbejdere", icon: Users, requiresRoutePlanning: true },
  { value: "reviews", label: "Anmeldelser", icon: Star },
  { value: "settings", label: "Indstillinger", icon: Settings },
];

type Business = {
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

  const routePlanningEnabled = !!(business.settings as any)?.route_planning_enabled;
  const visibleNav = NAV_ITEMS.filter((n) => !n.requiresRoutePlanning || routePlanningEnabled);
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
          "fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-border bg-background transition-transform duration-200 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/serviceydere-logo-dark.png" alt="Serviceydere" className="h-7" />
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
              <img src={business.logo_url} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-border object-contain bg-background p-1" />
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

        <nav className="flex-1 space-y-1 px-3 pt-1 pb-2 overflow-y-auto">
          {visibleNav.map((item) => {
            const isActive = activeTab === item.value;
            const baseClasses = cn(
              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left",
              isActive
                ? "bg-secondary text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
            );
            return (
              <button key={item.value} onClick={() => handleNavClick(item)} className={baseClasses}>
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
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
          {topbarRight && (
            <div className="ml-auto flex items-center gap-2 min-w-0">{topbarRight}</div>
          )}
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
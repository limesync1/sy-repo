// EmployeeShell — sidebar + topbar shell der matcher AdminShell præcis,
// så medarbejder-app'en har samme visuelle sprog som virksomhedspanelet.
//
// Brug:
//   <EmployeeShell title="Min dag" topbarRight={...}>
//     <indhold />
//   </EmployeeShell>
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import { LogOut, Menu, X, Calendar as CalendarIcon, BarChart3, MessageCircle, Briefcase } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyEmployee } from "@/hooks/useMyEmployee";
import { useMyBusiness } from "@/hooks/useDatabase";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  SidebarNavButton, SidebarFooterItem,
  SIDEBAR_WIDTH_EXPANDED,
} from "@/components/shared/sidebar/SidebarParts";

export type EmployeeTabKey = "today" | "stats" | "livechat";

type NavItem = {
  value: EmployeeTabKey;
  label: string;
  icon: any;
  href: string;
  /** Hvis sat, vises kun når medarbejderen har dette flag i sin record. */
  requiresEmployeeFlag?: "livechat_enabled";
};

const NAV_ITEMS: NavItem[] = [
  { value: "today", label: "Min dag", icon: CalendarIcon, href: "/medarbejder" },
  { value: "stats", label: "Statistik", icon: BarChart3, href: "/medarbejder/statistik" },
  { value: "livechat", label: "Livechat", icon: MessageCircle, href: "/medarbejder/livechat", requiresEmployeeFlag: "livechat_enabled" },
];

// Prefetch — start download af den anden side når brugeren hover'er nav-knappen.
// Medarbejder-app'en har kun to ruter, men prefetch gør skiftet øjeblikkeligt.
const TAB_PREFETCH: Record<string, () => Promise<unknown>> = {
  today: () => import("@/pages/EmployeeApp"),
  stats: () => import("@/pages/EmployeeStats"),
  livechat: () => import("@/pages/EmployeeLivechat"),
};
const prefetched = new Set<string>();
const prefetchTab = (key: string) => {
  if (prefetched.has(key)) return;
  prefetched.add(key);
  TAB_PREFETCH[key]?.().catch(() => prefetched.delete(key));
};

type EmployeeShellProps = {
  /** Aktiv fane — fremhæves i sidebar. */
  activeTab: EmployeeTabKey;
  /** Tekst i topbar. */
  title?: ReactNode;
  /** Indhold i højre side af topbar (knapper, badges osv.). */
  topbarRight?: ReactNode;
  /** Sat til false hvis siden selv styrer padding. */
  contentPadding?: boolean;
  /** Ekstra klasser på <main>. */
  contentClassName?: string;
  children: ReactNode;
};

export const EmployeeShell = ({
  activeTab, title, topbarRight,
  contentPadding = true, contentClassName, children,
}: EmployeeShellProps) => {
  const { user, signOut } = useAuth();
  const { data: employee } = useMyEmployee();
  // Hvis den indloggede medarbejder også ejer en virksomhed (typisk solo-
  // ejeren der har oprettet sig selv som medarbejder), så viser vi en
  // "Skift til virksomhedspanel"-knap i sidebar-footeren — symmetrisk med
  // "Skift til medarbejder" i AdminShell.
  const { data: myBusiness } = useMyBusiness();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const collapsed = false;

  // ESC lukker mobil-sidebar — matcher admin-paneler.
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSidebarOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  // Hent virksomhedens egen livechat-indstilling — medarbejderen må kun se
  // livechat-fanen hvis BÅDE virksomheden har funktionen aktiveret OG
  // medarbejderen har fået adgang individuelt.
  const { data: businessLivechatEnabled } = useQuery({
    queryKey: ["business-livechat-enabled", employee?.business_id],
    enabled: !!employee?.business_id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("businesses")
        .select("settings")
        .eq("id", employee!.business_id)
        .maybeSingle();
      return !!(data?.settings as any)?.livechat_enabled;
    },
  });

  const visibleNav = NAV_ITEMS.filter((n) => {
    if (!n.requiresEmployeeFlag) return true;
    if (n.requiresEmployeeFlag === "livechat_enabled") {
      return !!(employee as any)?.livechat_enabled && !!businessLivechatEnabled;
    }
    return !!(employee as any)?.[n.requiresEmployeeFlag];
  });
  const currentNav = NAV_ITEMS.find((n) => n.value === activeTab);
  const displayName =
    employee?.name ||
    (user?.user_metadata?.display_name as string | undefined) ||
    user?.email ||
    "Medarbejder";
  const subLabel = employee?.title || user?.email || "Medarbejder";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("") || "M";
  const accentColor = employee?.color || "hsl(var(--foreground))";
  const sidebarPx = SIDEBAR_WIDTH_EXPANDED;

  return (
    <div className="isolate flex min-h-dvh bg-secondary/50">
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

        {/* User info — matcher AdminShells "business info" card */}
        <div
          className={cn(
            "mt-3 mb-3 shrink-0 rounded-xl border border-border bg-card shadow-sm",
            collapsed ? "mx-2 px-2 py-2" : "mx-3 px-3 py-3",
          )}
          title={collapsed ? `${displayName} · ${subLabel}` : undefined}
        >
          <div className="flex items-center gap-2">
            <Avatar className="h-10 w-10 shrink-0 rounded-lg ring-2 ring-border" style={{ background: accentColor }}>
              {employee?.avatar_url ? (
                <AvatarImage src={employee.avatar_url} alt={displayName} className="rounded-lg object-cover" />
              ) : null}
              <AvatarFallback
                className="rounded-lg text-background font-bold text-sm"
                style={{ background: accentColor }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{subLabel}</p>
              </div>
            )}
          </div>
        </div>

        <nav className={cn("flex-1 space-y-1 pt-1 pb-2 overflow-y-auto", collapsed ? "px-2" : "px-3")}>
          {visibleNav.map((item) => (
            <SidebarNavButton
              key={item.value}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.value}
              collapsed={collapsed}
              onClick={() => { setSidebarOpen(false); navigate(item.href); }}
              onMouseEnter={() => prefetchTab(item.value)}
              onFocus={() => prefetchTab(item.value)}
              onTouchStart={() => prefetchTab(item.value)}
            />
          ))}
        </nav>

        <div className={cn("shrink-0 space-y-1 border-t border-border py-3", collapsed ? "px-2" : "px-3")}>
          {myBusiness && (
            <SidebarFooterItem
              icon={Briefcase}
              label="Skift til virksomhedspanel"
              onClick={() => navigate("/virksomhed")}
              collapsed={collapsed}
            />
          )}
          <SidebarFooterItem icon={LogOut} label="Log ud" onClick={signOut} collapsed={collapsed} danger />
        </div>
      </aside>

      {/* Main */}
      <div className="relative z-0 flex min-w-0 flex-1 flex-col">
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
            "relative z-0 flex-1 min-w-0",
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

export default EmployeeShell;
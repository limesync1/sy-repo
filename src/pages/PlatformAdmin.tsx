import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Navigate, Link } from "react-router-dom";
import { useState, lazy, Suspense, useEffect } from "react";
import {
  LayoutDashboard, Building2, Users, ShoppingCart, Star,
  LogOut, Menu, X, Repeat, Settings, MessageCircle, ExternalLink, Globe, History, Search, HeartPulse, Mail, Shield, Keyboard, AlertTriangle, Activity, Sparkles, Rocket,
} from "lucide-react";
import SEO from "@/components/SEO";
import { cn } from "@/lib/utils";
import { AdminFiltersProvider } from "@/components/platform-admin/lib/AdminFiltersContext";
import RangePicker from "@/components/platform-admin/RangePicker";
import { PageTransition } from "@/components/admin/shared/PageTransition";
import { PageSkeleton, ShellSkeleton, StatGridSkeleton, ChartSkeleton, ListCardSkeleton, PageHeaderSkeleton, FilterBarSkeleton, FormSkeleton } from "@/components/admin/shared/Skeletons";
import { TabErrorBoundary } from "@/components/admin/shared/TabErrorBoundary";
import { TabPerfTracker } from "@/components/admin/shared/usePerfMark";
import AdminCommandPalette from "@/components/platform-admin/AdminCommandPalette";
import AdminNotifications from "@/components/platform-admin/AdminNotifications";
import AdminBottomTabs from "@/components/platform-admin/AdminBottomTabs";
import AdminShortcutsHelp from "@/components/platform-admin/AdminShortcutsHelp";
import { useAdminShortcuts } from "@/components/platform-admin/lib/useAdminShortcuts";
import { useAdminBadges } from "@/components/platform-admin/lib/useAdminBadges";
import { useRecentTabs } from "@/components/platform-admin/lib/useRecentTabs";
import {
  SidebarNavButton, SidebarGroupLabel, SidebarFooterItem,
  SidebarCollapseToggle,
} from "@/components/shared/sidebar/SidebarParts";
import { useSidebarCollapsed } from "@/components/shared/sidebar/useSidebarCollapsed";

// Lazy-load alle tabs så hver fane først downloades når brugeren rent faktisk
// åbner den. Det matcher mønstret i virksomhedspanelet (Admin.tsx) og holder
// initial bundle lille — vigtigt fordi platform admin er sjældnere brugt.
const PlatformOverviewTab = lazy(() => import("@/components/platform-admin/PlatformOverviewTab"));
const PlatformBusinessesTab = lazy(() => import("@/components/platform-admin/PlatformBusinessesTab"));
const PlatformUsersTab = lazy(() => import("@/components/platform-admin/PlatformUsersTab"));
const PlatformOrdersTab = lazy(() => import("@/components/platform-admin/PlatformOrdersTab"));
const PlatformSubscriptionsTab = lazy(() => import("@/components/platform-admin/PlatformSubscriptionsTab"));
const PlatformReviewsTab = lazy(() => import("@/components/platform-admin/PlatformReviewsTab"));
const PlatformSettingsTab = lazy(() => import("@/components/platform-admin/PlatformPlatformSettingsTab"));
const PlatformLiveChatTab = lazy(() => import("@/components/platform-admin/PlatformLiveChatTab"));
const PlatformDomainsTab = lazy(() => import("@/components/platform-admin/PlatformDomainsTab"));
const PlatformAuditLogTab = lazy(() => import("@/components/platform-admin/PlatformAuditLogTab"));
const PlatformRouteErrorsTab = lazy(() => import("@/components/platform-admin/PlatformRouteErrorsTab"));
const PlatformRouteEventsTab = lazy(() => import("@/components/platform-admin/PlatformRouteEventsTab"));
const PlatformHealthTab = lazy(() => import("@/components/platform-admin/PlatformHealthTab"));
const PlatformMailsTab = lazy(() => import("@/components/platform-admin/PlatformMailsTab"));
const PlatformSecurityTab = lazy(() => import("@/components/platform-admin/PlatformSecurityTab"));
const PlatformAiQualityTab = lazy(() => import("@/components/platform-admin/PlatformAiQualityTab"));
const PlatformWaitlistTab = lazy(() => import("@/components/platform-admin/PlatformWaitlistTab"));

// Sidebar er nu delt i to logiske grupper. Det reducerer kognitiv belastning
// når man scanner 10+ menupunkter, og gør "drift"-flowet (det man bruger dagligt)
// visuelt adskilt fra "system"-fanerne (som åbnes sjældnere).
const NAV_GROUPS: { label: string; items: { value: string; label: string; icon: any; hasRange?: boolean }[] }[] = [
  {
    label: "Drift",
    items: [
      { value: "overview", label: "Overblik", icon: LayoutDashboard, hasRange: true },
      { value: "businesses", label: "Virksomheder", icon: Building2 },
      { value: "users", label: "Brugere", icon: Users },
      { value: "orders", label: "Ordrer", icon: ShoppingCart, hasRange: true },
      { value: "subscriptions", label: "Abonnementer", icon: Repeat },
    ],
  },
  {
    label: "Indhold & system",
    items: [
      { value: "reviews", label: "Anmeldelser", icon: Star },
      { value: "livechat", label: "Livechat", icon: MessageCircle },
      { value: "domains", label: "Domæner", icon: Globe },
      { value: "audit", label: "Aktivitetslog", icon: History },
      { value: "route-errors", label: "Rutefejl", icon: AlertTriangle },
      { value: "route-events", label: "Domæne-events", icon: Activity },
      { value: "health", label: "Sundhed", icon: HeartPulse },
      { value: "mails", label: "Mails", icon: Mail },
      { value: "waitlist", label: "Venteliste", icon: Rocket },
      { value: "ai-quality", label: "AI-kvalitet", icon: Sparkles },
      { value: "security", label: "Sikkerhed", icon: Shield },
      { value: "settings", label: "Platform", icon: Settings },
    ],
  },
];
const NAV = NAV_GROUPS.flatMap((g) => g.items);

// Prefetch — start download af en tab så snart musen rammer dens nav-knap.
// Når brugeren rent faktisk klikker er bundle (og ofte data) klar, og fane-skift
// føles øjeblikkeligt i stedet for at vise Suspense-fallbacken.
const TAB_PREFETCH: Record<string, () => Promise<unknown>> = {
  overview: () => import("@/components/platform-admin/PlatformOverviewTab"),
  businesses: () => import("@/components/platform-admin/PlatformBusinessesTab"),
  users: () => import("@/components/platform-admin/PlatformUsersTab"),
  orders: () => import("@/components/platform-admin/PlatformOrdersTab"),
  subscriptions: () => import("@/components/platform-admin/PlatformSubscriptionsTab"),
  reviews: () => import("@/components/platform-admin/PlatformReviewsTab"),
  livechat: () => import("@/components/platform-admin/PlatformLiveChatTab"),
  domains: () => import("@/components/platform-admin/PlatformDomainsTab"),
  audit: () => import("@/components/platform-admin/PlatformAuditLogTab"),
  "route-errors": () => import("@/components/platform-admin/PlatformRouteErrorsTab"),
  "route-events": () => import("@/components/platform-admin/PlatformRouteEventsTab"),
  health: () => import("@/components/platform-admin/PlatformHealthTab"),
  mails: () => import("@/components/platform-admin/PlatformMailsTab"),
  security: () => import("@/components/platform-admin/PlatformSecurityTab"),
  "ai-quality": () => import("@/components/platform-admin/PlatformAiQualityTab"),
  waitlist: () => import("@/components/platform-admin/PlatformWaitlistTab"),
  settings: () => import("@/components/platform-admin/PlatformPlatformSettingsTab"),
};
const prefetched = new Set<string>();
const prefetchTab = (key: string) => {
  if (prefetched.has(key)) return;
  prefetched.add(key);
  TAB_PREFETCH[key]?.().catch(() => prefetched.delete(key));
};

/** Per-tab loading-skeletons så hver fane viser et matchende layout. */
const PlatformTabFallback = ({ tab }: { tab: string }) => {
  switch (tab) {
    case "overview":
      return (
        <div className="space-y-4 animate-fade-in">
          <PageHeaderSkeleton withAction={false} />
          <StatGridSkeleton count={4} />
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartSkeleton height={220} />
            <ChartSkeleton height={220} />
          </div>
        </div>
      );
    case "businesses":
    case "users":
    case "orders":
    case "subscriptions":
      return <PageSkeleton statsCount={4} rows={6} withFilters />;
    case "reviews":
      return (
        <div className="space-y-4 animate-fade-in">
          <PageHeaderSkeleton withAction={false} />
          <StatGridSkeleton count={3} cols="sm:grid-cols-3" />
          <FilterBarSkeleton chips={1} withAction={false} />
          <ListCardSkeleton rows={5} />
        </div>
      );
    case "livechat":
      return (
        <div className="grid h-[calc(100vh-180px)] gap-4 lg:grid-cols-[320px_1fr] animate-fade-in">
          <ListCardSkeleton rows={6} />
          <ListCardSkeleton rows={8} />
        </div>
      );
    case "domains":
      return (
        <div className="space-y-4 animate-fade-in">
          <PageHeaderSkeleton />
          <ListCardSkeleton rows={4} />
        </div>
      );
    case "settings":
      return (
        <div className="space-y-4 animate-fade-in">
          <PageHeaderSkeleton />
          <FormSkeleton fields={6} />
        </div>
      );
    default:
      return <PageSkeleton statsCount={4} rows={6} withFilters />;
  }
};

const PlatformAdmin = () => {
  const { user, loading, signOut } = useAuth();
  const { data: isAdmin, isLoading: roleLoading } = useIsAdmin();
  const [tab, setTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  // Persisted collapse-state (key matches the convention from useSidebarCollapsed).
  // Sammenfoldning vises i sidepanelets footer på større skærme.
  const { collapsed, toggle } = useSidebarCollapsed("sy.sidebar.collapsed.platform");
  // Drift-badges: ulæste chats, forfaldne ordrer mv. → vises i sidebar/bottom-nav.
  const badges = useAdminBadges();
  // Husk seneste faner så kommando-paletten kan tilbyde dem øverst.
  const { recent } = useRecentTabs(tab);

  // ESC lukker mobil-sidebar — manglede tidligere.
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSidebarOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  // "?" → åbn shortcut-hjælp (ignoreres mens man skriver i input).
  useEffect(() => {
    const isTyping = (el: EventTarget | null) => {
      const t = el as HTMLElement | null;
      if (!t) return false;
      const tag = t.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) return;
      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Vim-style "g {key}" hop mellem faner — power-user-shortcut.
  useAdminShortcuts(setTab);

  if (loading || roleLoading) {
    // Vis layout-skeleton fra første millisekund — ingen blank skærm.
    return <ShellSkeleton />;
  }
  if (!user) return <Navigate to="/log-ind" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const current = NAV.find((n) => n.value === tab);
  const currentGroup = NAV_GROUPS.find((g) => g.items.some((i) => i.value === tab))?.label;
  return (
    <AdminFiltersProvider>
      <div className="admin-shell flex min-h-dvh bg-secondary/50">
        <SEO title="Platform Admin · Serviceydere" description="Administrér virksomheder, brugere og ordrer på Serviceydere." noIndex />

        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-foreground/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar — samme look som virksomhedspanelet */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-[320px] flex-col border-r border-border bg-background transition-[transform,width] duration-200 lg:sticky lg:top-0 lg:h-dvh lg:max-w-none lg:translate-x-0",
            collapsed ? "lg:w-[68px]" : "lg:w-[216px] xl:w-[248px]",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
          aria-label="Hovednavigation"
        >
          <div className={cn("flex h-14 shrink-0 items-center justify-between border-b border-border", collapsed ? "px-2" : "px-4")}>
            <Link to="/" className="flex items-center gap-2 overflow-hidden" aria-label="Forside">
              {collapsed ? (
                <img src="/serviceydere-ikon.webp" alt="Serviceydere" className="h-8 w-8 rounded-lg object-contain" width={64} height={64} decoding="async" loading="lazy" />
              ) : (
                <img src="/serviceydere-logo-dark.webp" alt="Serviceydere" className="h-9 w-auto" width={1920} height={539} decoding="async" loading="lazy" />
              )}
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
              aria-label="Luk menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className={cn("flex-1 space-y-1 overflow-y-auto pb-2 pt-1", collapsed ? "px-2" : "px-3")}>
            {NAV_GROUPS.map((group, gi) => (
              <div key={group.label} className="space-y-0.5">
                <SidebarGroupLabel collapsed={collapsed}>{group.label}</SidebarGroupLabel>
                {group.items.map((item) => (
                  <SidebarNavButton
                    key={item.value}
                    icon={item.icon}
                    label={item.label}
                    active={tab === item.value}
                    collapsed={collapsed}
                    onClick={() => { setTab(item.value); setSidebarOpen(false); }}
                    onMouseEnter={() => prefetchTab(item.value)}
                    onFocus={() => prefetchTab(item.value)}
                    onTouchStart={() => prefetchTab(item.value)}
                    shortcut={`g ${item.value.charAt(0)}`}
                    badge={badges[item.value]?.count}
                    badgeWarn={badges[item.value]?.warn}
                  />
                ))}
              </div>
            ))}
          </nav>

          <div className={cn("shrink-0 space-y-1 border-t border-border py-3", collapsed ? "px-2" : "px-3")}>
            <SidebarFooterItem icon={ExternalLink} label="Se forside" href="/" collapsed={collapsed} />
            <SidebarFooterItem icon={LogOut} label="Log ud" onClick={signOut} collapsed={collapsed} danger />
            <div className="pt-1">
              <SidebarCollapseToggle collapsed={collapsed} onToggle={toggle} />
            </div>
          </div>
        </aside>

        <div className="flex flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-4 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
              aria-label="Åbn menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            {/* Breadcrumb: group → current tab. Giver kontekst på tværs af 13 faner. */}
            <div className="flex min-w-0 items-center gap-1.5 text-sm">
              {currentGroup && (
                <>
                  <span className="hidden truncate text-muted-foreground sm:inline">{currentGroup}</span>
                  <span className="hidden text-muted-foreground/50 sm:inline" aria-hidden="true">/</span>
                </>
              )}
              <h1 className="truncate font-semibold text-foreground">{current?.label}</h1>
            </div>

            {/* Cmd+K søgning — hurtig adgang til virksomheder og faner */}
            <button
              onClick={() => setCmdOpen(true)}
              className="ml-auto inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
              aria-label="Søg (Cmd+K)"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Søg virksomheder, faner…</span>
              <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border bg-secondary px-1.5 font-mono text-[10px] font-semibold text-muted-foreground">⌘K</kbd>
            </button>

            <AdminNotifications onSelectTab={setTab} />

            {/* Tastatur-genveje-hjælp — gør power-user-flow opdageligt. */}
            <button
              onClick={() => setHelpOpen(true)}
              className="hidden rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 sm:inline-flex"
              aria-label="Vis tastatur-genveje (?)"
              title="Tastatur-genveje (?)"
            >
              <Keyboard className="h-4 w-4" />
            </button>

            {current?.hasRange && (
              <div className="flex items-center gap-2 min-w-0">
                <RangePicker />
              </div>
            )}
          </header>

          <main className="min-w-0 flex-1 p-3 pb-[calc(env(safe-area-inset-bottom)+72px)] sm:p-4 sm:pb-6 xl:p-6">
            {/* PageTransition fader nyt indhold ind når tab skifter,
                Suspense viser ensartet skeleton-loading på første åbning. */}
            <PageTransition transitionKey={tab}>
              <TabErrorBoundary resetKey={tab} label={current?.label}>
                <Suspense fallback={<PlatformTabFallback tab={tab} />}>
                  <TabPerfTracker tab={`platform:${tab}`} />
                  {tab === "overview" && <PlatformOverviewTab onNavigate={setTab} />}
                  {tab === "businesses" && <PlatformBusinessesTab />}
                  {tab === "users" && <PlatformUsersTab />}
                  {tab === "orders" && <PlatformOrdersTab />}
                  {tab === "subscriptions" && <PlatformSubscriptionsTab />}
                  {tab === "reviews" && <PlatformReviewsTab />}
                  {tab === "livechat" && <PlatformLiveChatTab />}
                  {tab === "domains" && <PlatformDomainsTab />}
                  {tab === "audit" && <PlatformAuditLogTab />}
                  {tab === "route-errors" && <PlatformRouteErrorsTab />}
                  {tab === "route-events" && <PlatformRouteEventsTab />}
                  {tab === "health" && <PlatformHealthTab />}
                  {tab === "mails" && <PlatformMailsTab />}
                  {tab === "ai-quality" && <PlatformAiQualityTab />}
                  {tab === "waitlist" && <PlatformWaitlistTab />}
                  {tab === "security" && <PlatformSecurityTab />}
                  {tab === "settings" && <PlatformSettingsTab />}
                </Suspense>
              </TabErrorBoundary>
            </PageTransition>
          </main>
        </div>

        <AdminCommandPalette open={cmdOpen} onOpenChange={setCmdOpen} onSelectTab={setTab} recentTabs={recent} />
        <AdminBottomTabs tab={tab} onSelectTab={setTab} onOpenMore={() => setSidebarOpen(true)} badges={badges} />
        <AdminShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
      </div>
    </AdminFiltersProvider>
  );
};

export default PlatformAdmin;

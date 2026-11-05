import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Navigate, Link } from "react-router-dom";
import { useState, lazy, Suspense, useEffect } from "react";
import {
  LayoutDashboard, Star, Building2, Users, ShoppingCart, Settings,
  LogOut, Menu, X, Repeat, MessageCircle, ExternalLink, Globe, History, Search, HeartPulse, Mail, Shield, Keyboard, AlertTriangle, Activity, Sparkles, Rocket,
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
import AdminShortcutsHelp from "@/components/platform-admin/AdminShortcutsHelp";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAdminShortcuts } from "@/components/platform-admin/lib/useAdminShortcuts";
import { useAdminBadges } from "@/components/platform-admin/lib/useAdminBadges";
import { useRecentTabs } from "@/components/platform-admin/lib/useRecentTabs";
import {
  SidebarNavButton, SidebarGroupLabel, SidebarFooterItem, SidebarWorkspaceRow,
} from "@/components/shared/sidebar/SidebarParts";
import PanelShell from "@/components/shared/sidebar/PanelShell";

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
const PlatformSeoEngineTab = lazy(() => import("@/components/platform-admin/PlatformSeoEngineTab"));
const PlatformWaitlistTab = lazy(() => import("@/components/platform-admin/PlatformWaitlistTab"));

// Sidebar er nu delt i to logiske grupper. Det reducerer kognitiv belastning
// når man scanner 10+ menupunkter, og gør "drift"-flowet (det man bruger dagligt)
// visuelt adskilt fra "system"-fanerne (som åbnes sjældnere).
const NAV_GROUPS: { label: string; items: { value: string; label: string; icon: any; hasRange?: boolean }[] }[] = [
  {
    label: "Daglig drift",
    items: [
      { value: "overview", label: "Overblik", icon: LayoutDashboard, hasRange: true },
      { value: "businesses", label: "Virksomheder", icon: Building2 },
      { value: "users", label: "Brugere", icon: Users },
      { value: "orders", label: "Ordrer", icon: ShoppingCart, hasRange: true },
      { value: "subscriptions", label: "Abonnementer", icon: Repeat },
    ],
  },
  {
    label: "Kunder & indhold",
    items: [
      { value: "livechat", label: "Livechat", icon: MessageCircle },
      { value: "reviews", label: "Anmeldelser", icon: Star },
      { value: "waitlist", label: "Venteliste", icon: Rocket },
      { value: "mails", label: "Mails", icon: Mail },
      { value: "seo", label: "SEO-motor", icon: Sparkles },
    ],
  },
  {
    label: "System",
    items: [
      { value: "health", label: "Sundhed", icon: HeartPulse },
      { value: "route-errors", label: "Rutefejl", icon: AlertTriangle },
      { value: "route-events", label: "Rutehændelser", icon: Activity },
      { value: "domains", label: "Domæner", icon: Globe },
      { value: "ai-quality", label: "AI-kvalitet", icon: Sparkles },
      { value: "security", label: "Sikkerhed", icon: Shield },
      { value: "audit", label: "Aktivitetslog", icon: History },
      { value: "settings", label: "Indstillinger", icon: Settings },
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
  seo: () => import("@/components/platform-admin/PlatformSeoEngineTab"),
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
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
  const setTab = useCallback((next: string) => {
    setSearchParams((prev) => { const p = new URLSearchParams(prev); p.set("tab", next); return p; });
  }, [setSearchParams]);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  // Drift-badges: ulæste chats, forfaldne ordrer mv. → vises i sidebar/bottom-nav.
  const badges = useAdminBadges();
  // Husk seneste faner så kommando-paletten kan tilbyde dem øverst.
  const { recent } = useRecentTabs(tab);

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
    return <ShellSkeleton variant="platform" navigationItems={12} />;
  }
  if (!user) return <Navigate to="/log-ind" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const current = NAV.find((n) => n.value === tab);
  const currentGroup = NAV_GROUPS.find((g) => g.items.some((i) => i.value === tab))?.label;
  return (
    <AdminFiltersProvider>
      <SEO title="Platform Admin · Serviceydere" description="Administrér virksomheder, brugere og ordrer på Serviceydere." noIndex />
      <PanelShell
        storageKey="sy.sidebar.collapsed.platform"
        workspaceClassName="admin-shell"
        title={current?.label}
        subtitle={currentGroup}
        topbarRight={
          <div className="flex items-center gap-1.5 sm:gap-2">
            {current?.hasRange && <div className="hidden md:flex"><RangePicker /></div>}
            <button
              onClick={() => setCmdOpen(true)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-border bg-background px-2.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
              aria-label="Søg (Cmd+K)"
            >
              <Search className="h-4 w-4" />
              <span className="hidden xl:inline">Søg virksomheder, brugere…</span>
              <kbd className="hidden xl:inline-flex h-5 items-center rounded border border-border bg-secondary px-1.5 font-mono text-[10px] font-semibold">⌘K</kbd>
            </button>
            <AdminNotifications onSelectTab={setTab} />
            <button
              onClick={() => setHelpOpen(true)}
              className="hidden min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:inline-flex"
              aria-label="Vis tastatur-genveje (?)"
            >
              <Keyboard className="h-4 w-4" />
            </button>
          </div>
        }
        topbarExtra={current?.hasRange ? (
          <div className="border-b border-border/60 bg-card px-3 py-2 md:hidden"><RangePicker /></div>
        ) : null}
        sidebarTop={(ctx) => (
          <SidebarWorkspaceRow name="Platformadmin" subtitle="Serviceydere drift" logoUrl="/serviceydere-ikon.webp" collapsed={ctx.collapsed} />
        )}
        sidebarNav={(ctx) => (
          <>
            {NAV_GROUPS.map((group, gi) => (
              <div key={group.label}>
                {!(gi === 0 && ctx.collapsed) && (
                  <SidebarGroupLabel collapsed={ctx.collapsed} first={gi === 0}>{group.label}</SidebarGroupLabel>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <SidebarNavButton
                      key={item.value}
                      icon={item.icon}
                      label={item.label}
                      active={tab === item.value}
                      collapsed={ctx.collapsed}
                      onClick={() => { ctx.closeDrawer(); setTab(item.value); }}
                      onMouseEnter={() => prefetchTab(item.value)}
                      onFocus={() => prefetchTab(item.value)}
                      onTouchStart={() => prefetchTab(item.value)}
                      badge={badges[item.value]?.count}
                      badgeWarn={badges[item.value]?.warn}
                    />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
        sidebarFooter={(ctx) => (
          <>
            <SidebarFooterItem icon={Building2} label="Virksomhedspanel" href="/virksomhed" collapsed={ctx.collapsed} />
            <SidebarFooterItem icon={ExternalLink} label="Se forside" href="/" collapsed={ctx.collapsed} />
            <SidebarFooterItem icon={LogOut} label="Log ud" onClick={signOut} collapsed={ctx.collapsed} danger />
          </>
        )}
      >
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
              {tab === "seo" && <PlatformSeoEngineTab />}
              {tab === "security" && <PlatformSecurityTab />}
              {tab === "settings" && <PlatformSettingsTab />}
            </Suspense>
          </TabErrorBoundary>
        </PageTransition>
      </PanelShell>
      <AdminCommandPalette open={cmdOpen} onOpenChange={setCmdOpen} onSelectTab={setTab} recentTabs={recent} />
      <AdminShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </AdminFiltersProvider>
  );
};

export default PlatformAdmin;

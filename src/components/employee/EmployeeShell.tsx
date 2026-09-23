// EmployeeShell — medarbejderpanelets fælles panelramme.
// Matcher virksomhedspanelets sidebar/topbar på computer og bruger en
// kompakt topbar + bundnavigation på mobil og tablet.
//
// Brug:
//   <EmployeeShell activeTab="today" title="Min dag" topbarRight={...}>
//     <indhold />
//   </EmployeeShell>
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import {
  LogOut, Calendar as CalendarIcon, BarChart3, MessageCircle, Briefcase, Building2,
  Bell, Check, ChevronsUpDown, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useMyEmployee, useMyEmployees } from "@/hooks/useMyEmployee";
import { useMyBusiness } from "@/hooks/useDatabase";
import { useEmployees } from "@/hooks/useEmployees";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getEmployeeWorkspace, setEmployeeWorkspace } from "@/lib/employee-workspace";
import EmployeeWorkspacePicker from "@/components/employee/EmployeeWorkspacePicker";
import { useEmployeeRouteNotifications, useMarkAllRouteNotificationsRead, useMarkRouteNotificationRead } from "@/hooks/useEmployeeRouteNotifications";
import { RoleSwitchFooterItem, SidebarFooterItem, SidebarGroupLabel, SidebarNavButton } from "@/components/shared/sidebar/SidebarParts";
import useSidebarCollapsed from "@/components/shared/sidebar/useSidebarCollapsed";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmployeeNotifications, type EmployeeRouteNotification } from "@/components/employee/EmployeeNotifications";



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
  const { data: myEmployeeRecords } = useMyEmployees();
  const queryClient = useQueryClient();
  const { data: routeNotifications = [] } = useEmployeeRouteNotifications();
  const markNotificationRead = useMarkRouteNotificationRead();
  const markAllNotificationsRead = useMarkAllRouteNotificationsRead();
  const unreadNotifications = routeNotifications.filter((item) => !item.read_at);
  const isMobile = useIsMobile();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  // Arbejder brugeren for flere virksomheder, skal der vælges arbejdsplads
  // før panelet vises. `pickerOpen` tvinger vælgeren frem ved manuelt skift.
  const [pickerOpen, setPickerOpen] = useState(false);
  // Har brugeren aktivt fravalgt "husk mit valg", holder vi valget til
  // sessionen i stedet for at gemme det permanent.
  const [rememberChoice, setRememberChoice] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(() => getEmployeeWorkspace());
  const { collapsed, toggle: toggleCollapsed } = useSidebarCollapsed("sy.sidebar.collapsed.employee");
  const multiWorkspace = (myEmployeeRecords?.length ?? 0) > 1;
  const needsWorkspaceChoice =
    multiWorkspace &&
    (pickerOpen || !myEmployeeRecords!.some((e) => e.business_id === workspaceId));

  // Gem valget permanent (localStorage) så brugeren automatisk lander i den
  // rigtige virksomhed ved næste login. Har brugeren kun ét arbejdssted,
  // gemmes det uden at spørge.
  useEffect(() => {
    const rows = myEmployeeRecords ?? [];
    if (rows.length === 0) return;
    if (rows.length === 1) {
      if (workspaceId !== rows[0].business_id) {
        setEmployeeWorkspace(rows[0].business_id, true);
        setWorkspaceId(rows[0].business_id);
      }
      return;
    }
    if (rememberChoice && workspaceId && rows.some((e) => e.business_id === workspaceId)) {
      setEmployeeWorkspace(workspaceId, true);
    }
  }, [myEmployeeRecords, workspaceId, rememberChoice]);


  // Hvis medarbejderen også ejer virksomheden (typisk solo-ejeren), så
  // vises "Skift til virksomhedspanel" i profilmenuen.
  const { data: myBusiness } = useMyBusiness();
  // Sole-employee detection — når virksomheden har præcis 1 aktiv medarbejder
  // og det er ejeren selv, viser vi en synlig genvej i topbaren (samme idé
  // som "Skift til medarbejder" i AdminShell's footer). Det gør hop frem og
  // tilbage til ét klik i stedet for to via profilmenuen.
  const { data: businessEmployees } = useEmployees(myBusiness?.id);
  const isSoloOwner =
    !!myBusiness &&
    !!employee &&
    Array.isArray(businessEmployees) &&
    businessEmployees.length === 1 &&
    businessEmployees[0]?.id === employee.id;
  const navigate = useNavigate();

  // Idle-prefetch ALLE medarbejderfaner kort efter mount, så Suspense aldrig
  // viser fallback ved fane-skift — kun den enkelte tabs interne data-load.
  // Fjerner følelsen af "siden loader to gange".
  useEffect(() => {
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    const trigger = () => Object.keys(TAB_PREFETCH).forEach((k) => prefetchTab(k));
    const id = ric ? ric(trigger, { timeout: 4000 }) : window.setTimeout(trigger, 2000);
    return () => {
      if (ric && (window as any).cancelIdleCallback) (window as any).cancelIdleCallback(id);
      else window.clearTimeout(id as number);
    };
  }, []);

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

  useEffect(() => {
    document.body.classList.add("service-panel-open");
    return () => document.body.classList.remove("service-panel-open");
  }, []);

  // Aktiv virksomhed — panelets data hentes udelukkende for denne.
  const activeBusiness = employee?.business ?? null;
  const activeBusinessName = activeBusiness?.name || "Virksomhed";
  const businessInitials =
    activeBusinessName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join("") || "V";



  if (needsWorkspaceChoice) {
    return (
      <EmployeeWorkspacePicker
        employees={myEmployeeRecords!}
        currentBusinessId={workspaceId}
        onSelected={(id, remember) => {
          setRememberChoice(remember);
          setWorkspaceId(id);
          setPickerOpen(false);
          // Alle medarbejder-data (ruter, stop, statistik) hænger på den
          // valgte virksomhed — ryd cachen så intet vises på tværs.
          queryClient.clear();
        }}
      />
    );
  }

  const openNotification = (item: EmployeeRouteNotification) => {
    if (!item.read_at) markNotificationRead.mutate(item.id);
    const targetRouteId = item.route_id || item.route_stops?.route_id;
    if (!targetRouteId) return;
    setNotificationsOpen(false);
    const stopQuery = item.route_stop_id ? `?stop=${encodeURIComponent(item.route_stop_id)}` : "";
    navigate(`/medarbejder/rute/${targetRouteId}${stopQuery}`);
  };

  const notificationContent = (
    <EmployeeNotifications
      notifications={routeNotifications as EmployeeRouteNotification[]}
      onOpen={openNotification}
      onMarkAllRead={() => markAllNotificationsRead.mutate()}
      markingAll={markAllNotificationsRead.isPending}
      compact={!isMobile}
    />
  );

  const notificationTrigger = (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-9 w-9 shrink-0"
      aria-label={`${unreadNotifications.length} ulæste notifikationer`}
    >
      <Bell className="h-4 w-4" />
      {unreadNotifications.length > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
          {Math.min(unreadNotifications.length, 9)}
        </span>
      )}
    </Button>
  );

  const notificationMenu = isMobile ? (
    <>
      <span onClick={() => setNotificationsOpen(true)}>{notificationTrigger}</span>
      <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <SheetContent side="bottom" className="max-h-[86dvh] gap-0 overflow-hidden p-0 sm:mx-auto sm:max-w-lg" hideCloseButton>
          <div className="flex justify-center py-2" aria-hidden><span className="h-1 w-10 rounded-full bg-muted-foreground/30" /></div>
          <SheetHeader className="sr-only">
            <SheetTitle>Notifikationer</SheetTitle>
            <SheetDescription>Beskeder om dine ruter og aftaler</SheetDescription>
          </SheetHeader>
          {notificationContent}
        </SheetContent>
      </Sheet>
    </>
  ) : (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {notificationTrigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[24rem] max-w-[calc(100vw-1rem)] overflow-hidden p-0">
        {notificationContent}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const profileMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" className="h-10 max-w-[12rem] gap-2 px-1.5 sm:px-2" aria-label="Profilmenu">
          <Avatar className="h-8 w-8 rounded-full ring-1 ring-border" style={{ background: accentColor }}>
            {employee?.avatar_url ? <AvatarImage src={employee.avatar_url} alt={displayName} className="rounded-full object-cover" /> : null}
            <AvatarFallback className="rounded-full text-xs font-bold text-background" style={{ background: accentColor }}>{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 text-left sm:block">
            <span className="block truncate text-xs font-semibold text-foreground">{displayName}</span>
            <span className="block truncate text-[10px] text-muted-foreground">{subLabel}</span>
          </span>
          <ChevronsUpDown className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate font-semibold">{displayName}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{subLabel}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {multiWorkspace && (
          <DropdownMenuItem onClick={() => setPickerOpen(true)}><Building2 className="mr-2 h-4 w-4" />Skift virksomhed</DropdownMenuItem>
        )}
        {myBusiness && (
          <DropdownMenuItem onClick={() => navigate("/virksomhed")}><Briefcase className="mr-2 h-4 w-4" />Skift til virksomhedspanel</DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />Log ud</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="service-panel-workspace employee-panel-workspace isolate flex min-h-dvh w-full max-w-full overflow-x-hidden bg-secondary/50">
      <aside
        className={cn(
          "service-panel-sidebar fixed inset-y-0 left-0 z-40 hidden h-dvh flex-col border-r border-border transition-[width] duration-300 lg:flex",
          collapsed ? "w-[68px]" : "w-[248px]",
        )}
        aria-label="Hovednavigation"
      >
        <div className={cn("flex h-14 shrink-0 items-center border-b border-border", collapsed ? "justify-center px-0" : "justify-between px-4")}>
          <Link to="/" className={cn("flex items-center gap-2 overflow-hidden", collapsed && "justify-center")} aria-label="Forside">
            {collapsed ? (
              <img src="/serviceydere-ikon.webp" alt="Serviceydere" className="h-8 w-8 rounded-lg object-contain" width={64} height={64} decoding="async" loading="lazy" />
            ) : (
              <>
                <img src="/serviceydere-logo-dark.webp" alt="Serviceydere" className="h-9 w-auto dark:hidden" width={1920} height={539} decoding="async" loading="lazy" />
                <img src="/serviceydere-logo.webp" alt="Serviceydere" className="hidden h-9 w-auto dark:block" width={1920} height={539} decoding="async" loading="lazy" />
              </>
            )}
          </Link>
        </div>

        <div className={cn("mx-3 mt-3 rounded-[5px] border border-border bg-card shadow-sm", collapsed ? "px-2 py-2" : "p-3")}>
          <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-2.5")}>
            <Avatar className="h-9 w-9 shrink-0 rounded-[5px] border border-border bg-background">
              {activeBusiness?.logo_url ? <AvatarImage src={activeBusiness.logo_url} alt={activeBusinessName} className="object-contain p-0.5" /> : null}
              <AvatarFallback className="rounded-[5px] bg-secondary text-xs font-bold text-foreground">{businessInitials}</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{activeBusinessName}</p>
                <p className="truncate text-[11px] text-muted-foreground">{employee?.title || "Medarbejder"}</p>
              </div>
            )}
            {!collapsed && multiWorkspace && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setPickerOpen(true)} aria-label="Skift arbejdsplads">
                <ChevronsUpDown className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <nav className={cn("flex-1 overflow-y-auto pb-3", collapsed ? "px-2" : "px-3")}>
          <SidebarGroupLabel collapsed={collapsed}>Arbejde</SidebarGroupLabel>
          <div className="space-y-1">
            {visibleNav.map((item) => (
              <SidebarNavButton
                key={item.value}
                icon={item.icon}
                label={item.label}
                active={activeTab === item.value}
                collapsed={collapsed}
                badge={item.value === "today" ? unreadNotifications.length : null}
                badgeWarn={item.value === "today" && unreadNotifications.length > 0}
                onClick={() => navigate(item.href)}
                onMouseEnter={() => prefetchTab(item.value)}
                onFocus={() => prefetchTab(item.value)}
              />
            ))}
          </div>
        </nav>

        <div className={cn("shrink-0 space-y-1 border-t border-border py-3", collapsed ? "px-2" : "px-3")}>
          {multiWorkspace && <SidebarFooterItem icon={Building2} label="Skift arbejdsplads" onClick={() => setPickerOpen(true)} collapsed={collapsed} />}
          {(myBusiness || isSoloOwner) && <RoleSwitchFooterItem icon={Briefcase} label="Virksomhedspanel" onClick={() => navigate("/virksomhed")} collapsed={collapsed} />}
          <SidebarFooterItem icon={LogOut} label="Log ud" onClick={signOut} collapsed={collapsed} danger />
        </div>
      </aside>

      <div className={cn("flex min-w-0 flex-1 flex-col overflow-x-hidden transition-[padding] duration-300", collapsed ? "lg:pl-[68px]" : "lg:pl-[248px]")}>
        <header className="service-panel-topbar sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:px-5">
          <Link to="/" className="flex shrink-0 items-center lg:hidden" aria-label="Forside">
            <img src="/serviceydere-ikon.webp" alt="Serviceydere" className="h-8 w-8 rounded-md object-contain" width={64} height={64} />
          </Link>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" onClick={toggleCollapsed} className="hidden rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:inline-flex" aria-label={collapsed ? "Vis sidemenu" : "Skjul sidemenu"} aria-pressed={collapsed}>
                {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{collapsed ? "Vis sidemenu" : "Skjul sidemenu"} <span className="opacity-60">[</span></TooltipContent>
          </Tooltip>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">{title ?? currentNav?.label}</h1>
            <p className="hidden truncate text-[11px] text-muted-foreground sm:block">{activeBusinessName}</p>
          </div>
          <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
            {topbarRight}
            {notificationMenu}
            {multiWorkspace && (
              <Button type="button" variant="outline" onClick={() => setPickerOpen(true)} className="hidden h-9 max-w-[12rem] gap-2 px-2.5 md:inline-flex"
                aria-label={`Aktiv virksomhed: ${activeBusinessName}. Skift virksomhed`}
              >
                <Building2 className="h-4 w-4 shrink-0" /><span className="truncate">{activeBusinessName}</span><ChevronsUpDown className="h-3.5 w-3.5 shrink-0" />
              </Button>
            )}
            {profileMenu}
          </div>
        </header>

        <main
          className={cn(
            "service-panel-content relative z-0 min-w-0 flex-1 overflow-x-hidden",
            contentPadding ? "px-3 pt-3 pb-[calc(72px+env(safe-area-inset-bottom))] sm:px-5 sm:pt-5 lg:px-6 lg:pb-6" : "pb-[calc(64px+env(safe-area-inset-bottom))] lg:pb-0",
            contentClassName,
          )}
        >
          {children}
        </main>

        {visibleNav.length > 1 && (
          <nav className="service-panel-bottomnav fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 shadow-[0_-6px_20px_-18px_hsl(var(--foreground)/0.5)] backdrop-blur lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} aria-label="Bundnavigation">
            <ul className="mx-auto flex max-w-md items-stretch justify-around">
              {visibleNav.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.value;
                return (
                  <li key={item.value} className="flex-1">
                    <button type="button" onClick={() => navigate(item.href)} onTouchStart={() => prefetchTab(item.value)} className={cn("relative flex min-h-[58px] w-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors", active ? "text-accent" : "text-muted-foreground hover:text-foreground")} aria-current={active ? "page" : undefined}>
                      <span
                      className={cn(
                          "flex h-7 w-12 items-center justify-center rounded-[5px] transition-colors",
                          active ? "bg-accent/10 text-accent" : "bg-transparent",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {item.value === "today" && unreadNotifications.length > 0 && <span className="absolute right-[calc(50%-22px)] top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />}
                      </span>
                      <span className="leading-tight">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
};

export default EmployeeShell;
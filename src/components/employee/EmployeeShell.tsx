// EmployeeShell — medarbejderpanelets fælles panelramme.
// Al layout (sidebar, drawer, topbar, bundnav) ligger i PanelShell, så
// medarbejder- og virksomhedspanelet opfører sig ens på alle skærmstørrelser.
// Her ligger kun det medarbejder-specifikke: arbejdsplads-valg, notifikationer
// og navigation. Props er UÆNDREDE.
//
// Brug:
//   <EmployeeShell activeTab="today" title="Min dag" topbarRight={...}>
//     <indhold />
//   </EmployeeShell>
import { EmployeeAvatar, readableOnEmployeeColor } from "@/components/shared/EmployeeAvatar";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import {
  LogOut, MessageCircle, Briefcase, Building2,
  Bell, ChevronsUpDown, ListChecks, TrendingUp, UserRound,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { useMyEmployee, useMyEmployees } from "@/hooks/useMyEmployee";
import { useMyBusiness } from "@/hooks/useDatabase";
import { useEmployees } from "@/hooks/useEmployees";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { getEmployeeWorkspace, setEmployeeWorkspace } from "@/lib/employee-workspace";
import EmployeeWorkspacePicker from "@/components/employee/EmployeeWorkspacePicker";
import {
  useDeleteAllRouteNotifications, useDeleteRouteNotification, useEmployeeRouteNotifications,
  useMarkAllRouteNotificationsRead, useMarkRouteNotificationRead,
} from "@/hooks/useEmployeeRouteNotifications";
import {
  RoleSwitchFooterItem, SidebarGroupLabel, SidebarNavButton, SidebarProfileMenu,
  SidebarWorkspaceRow, initialsOf, type ProfileMenuItem,
} from "@/components/shared/sidebar/SidebarParts";
import PanelBottomNav from "@/components/shared/sidebar/PanelBottomNav";
import PanelShell from "@/components/shared/sidebar/PanelShell";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmployeeNotifications, type EmployeeRouteNotification } from "@/components/employee/EmployeeNotifications";
import { ShellSkeleton } from "@/components/admin/shared/Skeletons";
import { EmployeeProfileSheet } from "@/components/employee/EmployeeProfileSheet";

export type EmployeeTabKey = "today" | "stats" | "livechat";

const navigateWithinEmployeePanel = (navigate: ReturnType<typeof useNavigate>, href: string) => {
  sessionStorage.setItem("sy.panel.navigation", "1");
  navigate(href);
};

type NavItem = {
  value: EmployeeTabKey;
  label: string;
  icon: any;
  href: string;
  /** Hvis sat, vises kun når medarbejderen har dette flag i sin record. */
  requiresEmployeeFlag?: "livechat_enabled";
};

const NAV_ITEMS: NavItem[] = [
  { value: "today", label: "Min dag", icon: ListChecks, href: "/medarbejder" },
  { value: "stats", label: "Statistik", icon: TrendingUp, href: "/medarbejder/statistik" },
  { value: "livechat", label: "Livechat", icon: MessageCircle, href: "/medarbejder/livechat", requiresEmployeeFlag: "livechat_enabled" },
];

// Prefetch — start download af siden når brugeren hover'er/rører nav-knappen.
const TAB_PREFETCH: Record<EmployeeTabKey, () => Promise<unknown>> = {
  today: () => import("@/pages/EmployeeApp"),
  stats: () => import("@/pages/EmployeeStats"),
  livechat: () => import("@/pages/EmployeeLivechat"),
};
const prefetched = new Set<string>();
const prefetchTab = (key: EmployeeTabKey) => {
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
  const { data: employee, isLoading: employeeLoading } = useMyEmployee();
  const { data: myEmployeeRecords, isLoading: employeesLoading } = useMyEmployees();
  const queryClient = useQueryClient();
  const { data: routeNotifications = [] } = useEmployeeRouteNotifications();
  const markNotificationRead = useMarkRouteNotificationRead();
  const markAllNotificationsRead = useMarkAllRouteNotificationsRead();
  const deleteNotification = useDeleteRouteNotification();
  const deleteAllNotifications = useDeleteAllRouteNotifications();
  const unreadNotifications = routeNotifications.filter((item) => !item.read_at);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Arbejder brugeren for flere virksomheder, skal der vælges arbejdsplads
  // før panelet vises. `pickerOpen` tvinger vælgeren frem ved manuelt skift.
  const [pickerOpen, setPickerOpen] = useState(false);
  // Har brugeren fravalgt "husk mit valg", holder vi valget til sessionen.
  const [rememberChoice, setRememberChoice] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(() => getEmployeeWorkspace());
  const multiWorkspace = (myEmployeeRecords?.length ?? 0) > 1;
  const needsWorkspaceChoice =
    multiWorkspace &&
    (pickerOpen || !(myEmployeeRecords ?? []).some((e) => e.business_id === workspaceId));

  // Gem valget permanent (localStorage) så brugeren lander i den rigtige
  // virksomhed ved næste login. Ét arbejdssted gemmes uden at spørge.
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

  // Medarbejderen ejer også virksomheden (typisk solo-ejer) → vis skift-genvej.
  const { data: myBusiness } = useMyBusiness();
  const { data: businessEmployees } = useEmployees(myBusiness?.id);
  const isSoloOwner =
    !!myBusiness &&
    !!employee &&
    Array.isArray(businessEmployees) &&
    businessEmployees.length === 1 &&
    businessEmployees[0]?.id === employee.id;

  // Idle-prefetch ALLE medarbejderfaner kort efter mount, så Suspense aldrig
  // viser fallback ved fane-skift.
  useEffect(() => {
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    const cic = (window as any).cancelIdleCallback as ((id: number) => void) | undefined;
    const trigger = () => (Object.keys(TAB_PREFETCH) as EmployeeTabKey[]).forEach(prefetchTab);
    const id = ric ? ric(trigger, { timeout: 4000 }) : window.setTimeout(trigger, 2000);
    return () => {
      if (ric && cic) cic(id as number);
      else window.clearTimeout(id as number);
    };
  }, []);

  const visibleNav = NAV_ITEMS.filter((n) => !n.requiresEmployeeFlag || !!(employee as any)?.[n.requiresEmployeeFlag]);
  const currentNav = NAV_ITEMS.find((n) => n.value === activeTab);
  const displayName =
    employee?.name ||
    (user?.user_metadata?.display_name as string | undefined) ||
    user?.email ||
    "Medarbejder";
  const subLabel = employee?.title || user?.email || "Medarbejder";
  const accentColor = employee?.color || "hsl(var(--foreground))";

  // Aktiv virksomhed — panelets data hentes udelukkende for denne.
  const activeBusiness = employee?.business ?? null;
  const activeBusinessName = activeBusiness?.name || "Virksomhed";

  // Bloker IKKE hele shell'en mens medarbejder-data hentes — siderne
  // (EmployeeStats, EmployeeApp osv.) viser selv deres egen skeleton for
  // indholdet. Blokerer vi her, ser brugeren to forskellige skeletons efter
  // hinanden (først ShellSkeleton, så sidens egen). Sidebar/topbar falder
  // gracefully tilbage til neutrale værdier (employee?.xxx) indtil data er klar.
  const unreadCount = unreadNotifications.length;

  /* ---------------- Notifikationer ---------------- */
  const notificationContent = (
    <EmployeeNotifications
      notifications={routeNotifications as EmployeeRouteNotification[]}
      onOpen={(item: EmployeeRouteNotification) => { if (!item.read_at) markNotificationRead.mutate(item.id); }}
      onMarkAllRead={() => markAllNotificationsRead.mutate()}
      onDelete={(id) => deleteNotification.mutate(id)}
      onDeleteAll={() => deleteAllNotifications.mutate()}
      markingAll={markAllNotificationsRead.isPending}
      compact={!isMobile}
    />
  );

  const notificationTrigger = (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-11 w-11 shrink-0"
      aria-label={`${unreadCount} ulæste notifikationer`}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground ring-2 ring-card">
          {Math.min(unreadCount, 9)}
        </span>
      )}
    </Button>
  );

  const notificationMenu = isMobile ? (
    <>
      <span onClick={() => setNotificationsOpen(true)}>{notificationTrigger}</span>
      <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <SheetContent side="bottom" className="appointment-details-overlay planner-overlay flex max-h-[calc(100dvh-1rem)] flex-col gap-0 overflow-y-auto overscroll-contain rounded-md p-0 sm:mx-auto sm:max-w-lg" hideCloseButton>
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
      <DropdownMenuTrigger asChild>{notificationTrigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[24rem] max-w-[calc(100vw-1rem)] overflow-hidden p-0">
        {notificationContent}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  /* ---------------- Profilmenu i topbaren (kun <lg; desktop har den i sidebaren) ---------------- */
  const topbarProfileMenu = (
    <div className="lg:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" className="h-11 gap-2 px-1.5" aria-label="Profilmenu">
            <Avatar className="h-8 w-8 rounded-full ring-1 ring-border" style={{ background: accentColor }}>
              {employee?.avatar_url ? <AvatarImage src={employee.avatar_url} alt={displayName} className="rounded-full object-cover" /> : null}
              <AvatarFallback className="rounded-full text-xs font-bold" style={{ background: accentColor, color: readableOnEmployeeColor(employee?.color) }}>
                {initialsOf(displayName, "M")}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="flex flex-col">
            <span className="truncate font-semibold">{displayName}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">{subLabel}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setProfileOpen(true)}><UserRound className="mr-2 h-4 w-4" />Rediger profil</DropdownMenuItem>
          {multiWorkspace && (
            <DropdownMenuItem onClick={() => setPickerOpen(true)}><Building2 className="mr-2 h-4 w-4" />Skift virksomhed</DropdownMenuItem>
          )}
          {myBusiness && (
            <DropdownMenuItem onClick={() => navigate("/virksomhed")}><Briefcase className="mr-2 h-4 w-4" />Skift til virksomhedspanel</DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />Log ud</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  /* ---------------- Sidebar-profil ---------------- */
  const sidebarProfileItems: ProfileMenuItem[] = [
    { key: "profile", icon: UserRound, label: "Rediger profil", onSelect: () => setProfileOpen(true) },
    ...(multiWorkspace
      ? [{ key: "switch", icon: Building2, label: "Skift arbejdsplads", onSelect: () => setPickerOpen(true) }]
      : []),
    { key: "logout", icon: LogOut, label: "Log ud", onSelect: signOut, danger: true, separatorBefore: multiWorkspace },
  ];

  return (
    <PanelShell
      storageKey="sy.sidebar.collapsed.employee"
      workspaceClassName="employee-panel-workspace isolate"
      title={needsWorkspaceChoice ? "Vælg arbejdsplads" : (title ?? currentNav?.label)}
      subtitle={activeBusinessName}
      contentPadding={contentPadding}
      contentClassName={contentClassName}
      bottomNavigation={!needsWorkspaceChoice ? <PanelBottomNav
        primary={visibleNav.map((item) => ({ key: item.value, label: item.label, icon: item.icon, active: activeTab === item.value, onSelect: () => navigateWithinEmployeePanel(navigate, item.href), onPrefetch: () => prefetchTab(item.value) }))}
        more={[
          { key: "profile", label: "Rediger profil", icon: UserRound, active: false, onSelect: () => setProfileOpen(true) },
          ...(multiWorkspace ? [{ key: "workspace", label: "Skift arbejdsplads", icon: Building2, active: false, onSelect: () => setPickerOpen(true) }] : []),
          ...(myBusiness || isSoloOwner ? [{ key: "business", label: "Virksomhedspanel", icon: Briefcase, active: false, onSelect: () => navigate("/virksomhed") }] : []),
          { key: "logout", label: "Log ud", icon: LogOut, active: false, onSelect: signOut },
        ]}
      /> : undefined}
      topbarRight={
        <>
          {topbarRight}
          {notificationMenu}
          {multiWorkspace && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setPickerOpen(true)}
              className="hidden h-9 max-w-[12rem] gap-2 px-2.5 transition-[background-color,border-color,transform] duration-200 ease-out hover:-translate-y-px md:inline-flex motion-reduce:transform-none"
              aria-label={`Aktiv virksomhed: ${activeBusinessName}. Skift virksomhed`}
            >
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{activeBusinessName}</span>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0" />
            </Button>
          )}
          {topbarProfileMenu}
        </>
      }
      sidebarTop={(ctx) => (
        <SidebarWorkspaceRow
          name={activeBusinessName}
          subtitle={employee?.title || "Medarbejder"}
          logoUrl={activeBusiness?.logo_url}
          collapsed={ctx.collapsed}
          onClick={multiWorkspace ? () => { ctx.closeDrawer(); setPickerOpen(true); } : undefined}
          ariaLabel={multiWorkspace ? "Skift arbejdsplads" : undefined}
          trailing={multiWorkspace ? <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
        />
      )}
      sidebarNav={(ctx) => (
        <>
          <SidebarGroupLabel collapsed={ctx.collapsed} first>Arbejde</SidebarGroupLabel>
          <div className="space-y-0.5">
            {visibleNav.map((item) => (
              <SidebarNavButton
                key={item.value}
                icon={item.icon}
                label={item.label}
                active={activeTab === item.value}
                collapsed={ctx.collapsed}
                badge={item.value === "today" ? unreadCount : null}
                badgeWarn={item.value === "today" && unreadCount > 0}
                onClick={() => { ctx.closeDrawer(); navigateWithinEmployeePanel(navigate, item.href); }}
                onMouseEnter={() => prefetchTab(item.value)}
                onFocus={() => prefetchTab(item.value)}
                onTouchStart={() => prefetchTab(item.value)}
              />
            ))}
          </div>
        </>
      )}
      sidebarFooter={(ctx) => (
        <>
          {(myBusiness || isSoloOwner) && (
            <RoleSwitchFooterItem
              icon={Building2}
              label="Virksomhedspanel"
              onClick={() => { ctx.closeDrawer(); navigate("/virksomhed"); }}
              collapsed={ctx.collapsed}
            />
          )}
          <SidebarProfileMenu
            name={displayName}
            subtitle={subLabel}
            avatarUrl={employee?.avatar_url}
            avatarColor={accentColor}
            collapsed={ctx.collapsed}
            items={sidebarProfileItems}
            fallback="M"
          />
        </>
      )}
    >
      {needsWorkspaceChoice ? (
        <EmployeeWorkspacePicker
        employees={myEmployeeRecords ?? []}
        currentBusinessId={workspaceId}
        onSelected={async (id, remember) => {
          setRememberChoice(remember);
          // Nulstil i stedet for at rydde cachen: `clear()` frakobler de
          // aktive sider, så Min dag blev stående med den forrige
          // arbejdsplads (ingen tidsregistrering og "0 ruter").
          await queryClient.cancelQueries();
          setWorkspaceId(id);
          void queryClient.resetQueries();
          setPickerOpen(false);
        }}
      />
      ) : children}
      <EmployeeProfileSheet open={profileOpen} onOpenChange={setProfileOpen} employee={employee} userId={user?.id} />
    </PanelShell>
  );
};

export default EmployeeShell;

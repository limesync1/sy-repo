// AdminShell — virksomhedspanelets ramme (Overblik, Services, Aftaler, Kunder,
// Medarbejdere, Anmeldelser, Indstillinger) OG Ruteplanlæggeren.
//
// Al layout-logik ligger nu i PanelShell; her er kun det der er specifikt for
// virksomhedspanelet: navigation, feature-flags, DPA-gate og topbar-handlinger.
// Props er UÆNDREDE, så Admin.tsx og RoutePlanner ikke skal røres.
//
// Navigationen defineres i ./adminNav (én sandhed for sidebar, drawer og bundnav).
import { useNavigate } from "react-router-dom";
import { useEffect, type ReactNode } from "react";
import { ExternalLink, LogOut, Rocket, Truck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessPlan } from "@/hooks/useBusinessPlan";
import { useEmployees } from "@/hooks/useEmployees";
import { useMyEmployee } from "@/hooks/useMyEmployee";
import { useOnboardingSignals } from "@/hooks/useOnboardingSignals";
import {
  SidebarNavButton, SidebarFooterItem, RoleSwitchFooterItem, SidebarGroupLabel,
  SidebarCollapsibleRow, SidebarWorkspaceRow, SidebarProgressCard, SidebarProfileMenu,
  type ProfileMenuItem,
} from "@/components/shared/sidebar/SidebarParts";
import PanelShell from "@/components/shared/sidebar/PanelShell";
import PanelBottomNav, { type BottomNavItem } from "@/components/shared/sidebar/PanelBottomNav";
import supportIcon from "@/assets/kundeservice-ikon.svg.asset.json";
import { DPAGate, useDpaBlocked } from "@/components/admin/DPAAcceptanceBanner";
import {
  ADMIN_NAV_GROUPS, ADMIN_NAV_ITEMS, TAB_PREFETCH, adminMobilePrimaryKeys, adminNeighbours,
  findAdminNavItem, isAdminNavVisible, prefetchAdminTab,
  type AdminFeatureFlags, type AdminNavItem, type AdminTabKey,
} from "./adminNav";

// Admin.tsx m.fl. importerer typen herfra — bevar den eksport.
export type { AdminTabKey } from "./adminNav";

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
  /** Kaldes når en fane uden href klikkes (Admin.tsx har intern tab-state). */
  onTabChange?: (tab: AdminTabKey) => void;
  /** Tekst i topbar (hvis ikke sat → label fra aktivt nav-item). */
  title?: ReactNode;
  /** Indhold i højre side af topbar (knapper, dato-nav osv.). */
  topbarRight?: ReactNode;
  /** Sat til false hvis siden selv styrer padding (fx ruteplanlægger). */
  contentPadding?: boolean;
  /** Ekstra klasser på <main>. */
  contentClassName?: string;
  /** Tillader at folde sidebaren sammen på store skærme. Huskes pr. bruger. */
  collapsible?: boolean;
  /** Skjuler "Kundeservice"-knappen og virksomheds-ID'et i topbaren. */
  hideTopbarUtilities?: boolean;
  /**
   * Animér sidebar-bredden. Default: true for almindelige sider, false når
   * contentPadding=false (fuldbredde-sider som kalenderen, hvor en animeret
   * bredde ville give re-layout hver frame).
   */
  animateLayout?: boolean;
  children: ReactNode;
};

export const AdminShell = ({
  business, activeTab, onTabChange, title, topbarRight,
  contentPadding = true, contentClassName, collapsible = true,
  hideTopbarUtilities = false, animateLayout, children,
}: AdminShellProps) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  // Holder plan-data varm i cachen (bruges af faner senere).
  useBusinessPlan(business.id);

  // Når databehandleraftalen mangler godkendelse, skjuler vi panelets
  // handlingsknapper i topbaren — kun accept-skærmen må være tilgængelig.
  const isOwner = (business as any).owner_id === user?.id;
  const { blocked: dpaBlocked, isLoading: dpaLoading } = useDpaBlocked(business.id, isOwner);
  const hideActions = dpaBlocked || dpaLoading;

  // Genvej til medarbejder-appen: kun når virksomheden har præcis én
  // medarbejder OG det er den indloggede ejer selv.
  const { data: employees } = useEmployees(business.id);
  const { data: myEmployee } = useMyEmployee();
  const isSoloOwnerEmployee =
    !!myEmployee &&
    Array.isArray(employees) &&
    employees.length === 1 &&
    employees[0]?.id === myEmployee.id;

  const settings = (business.settings ?? {}) as any;
  const flags: AdminFeatureFlags = {
    routePlanning: !!settings.route_planning_enabled,
    leads: !!settings.leads_enabled,
    livechat: !!settings.livechat_enabled,
    accounting: !!settings.accounting_integration_enabled,
  };

  // Onboarding styrer om "Kom godt i gang"-kortet vises. Forsvinder af sig selv
  // når alt er grønt — men bliver stående så længe man står på fanen.
  const onboarding = useOnboardingSignals(business);
  const showGettingStarted = !!onboarding.counts && (!onboarding.allDone || activeTab === "getting-started");
  const gsDone = onboarding.counts ? onboarding.completedCount : 0;
  const gsTotal = onboarding.counts ? onboarding.totalCount : 0;
  const gsBadge = onboarding.counts && !onboarding.allDone ? `${gsDone}/${gsTotal}` : null;

  // Idle-prefetch i to bølger: nabo-faner hurtigt, resten langsomt. Efter ~5 s
  // er alle chunks i memory, så Suspense aldrig viser fallback ved fane-skift.
  useEffect(() => {
    const neighbours = adminNeighbours(activeTab);
    const rest = (Object.keys(TAB_PREFETCH) as AdminTabKey[]).filter(
      (k) => k !== activeTab && !neighbours.includes(k),
    );
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    const cic = (window as any).cancelIdleCallback as ((id: number) => void) | undefined;
    const near = () => neighbours.forEach(prefetchAdminTab);
    const far = () => rest.forEach(prefetchAdminTab);
    const id1 = ric ? ric(near, { timeout: 3000 }) : window.setTimeout(near, 2500);
    const id2 = ric ? ric(far, { timeout: 8000 }) : window.setTimeout(far, 5000);
    return () => {
      if (ric && cic) { cic(id1 as number); cic(id2 as number); }
      else { window.clearTimeout(id1 as number); window.clearTimeout(id2 as number); }
    };
  }, [activeTab]);

  const go = (item: AdminNavItem) => {
    if (item.href) { navigate(item.href); return; }
    if (onTabChange) { onTabChange(item.value); return; }
    // På en anden side end /virksomhed (fx /virksomhed/ruter): naviger hjem.
    navigate(`/virksomhed?tab=${item.value}`);
  };

  const currentNav = findAdminNavItem(activeTab);
  const displayName =
    (user?.user_metadata?.display_name as string | undefined) || user?.email || "Konto";

  /* ---------------- Mobil bundnavigation ---------------- */
  const toBottomItem = (item: AdminNavItem): BottomNavItem => ({
    key: item.value,
    label: item.label,
    icon: item.icon,
    active: activeTab === item.value,
    onSelect: () => go(item),
    onPrefetch: () => prefetchAdminTab(item.value),
    badge: item.value === "getting-started" ? gsBadge : null,
  });
  const primaryKeys = adminMobilePrimaryKeys(flags);
  const primaryItems = primaryKeys
    .map(findAdminNavItem)
    .filter((i): i is AdminNavItem => !!i)
    .map(toBottomItem);
  const moreItems = ADMIN_NAV_ITEMS
    .filter((i) => isAdminNavVisible(i, flags) && !primaryKeys.includes(i.value))
    .filter((i) => i.value !== "getting-started" || showGettingStarted)
    .map(toBottomItem);

  /* ---------------- Profil-menu (sidebar-bund) ---------------- */
  const profileItems: ProfileMenuItem[] = [
    { key: "public", icon: ExternalLink, label: "Se din side", href: `/v/${business.slug}` },
    { key: "logout", icon: LogOut, label: "Log ud", onSelect: signOut, danger: true, separatorBefore: true },
  ];

  /* ---------------- Topbar-indhold ---------------- */
  const publicId = (business as any).public_id as string | undefined;
  const topbarActions = (
    <>
      {topbarRight && !hideActions && (
        <div className="hidden min-w-0 items-center gap-2 sm:flex">{topbarRight}</div>
      )}
      {!hideTopbarUtilities && publicId && (
        <button
          type="button"
          title="Kopiér virksomheds-ID"
          onClick={() => { navigator.clipboard?.writeText(publicId).catch(() => {}); }}
          className="hidden h-9 shrink-0 items-center rounded-full bg-secondary/70 px-2.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground ring-1 ring-inset ring-border transition-colors hover:bg-secondary hover:text-foreground md:inline-flex"
        >
          ID {publicId}
        </button>
      )}
      {!hideTopbarUtilities && (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("serviceydere:open-platform-chat"))}
          title="Kontakt Serviceydere kundeservice"
          aria-label="Kontakt Serviceydere kundeservice"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-foreground px-2.5 text-xs font-semibold text-background shadow-sm transition-[background-color,transform] hover:bg-foreground/90 active:scale-95 motion-reduce:transition-none sm:px-3"
        >
          <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
            <img src={supportIcon.url} alt="" className="h-6 w-6 object-contain" />
            <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/70 opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success ring-2 ring-foreground" />
            </span>
          </span>
          <span className="hidden sm:inline">Kundeservice</span>
        </button>
      )}
    </>
  );

  return (
    <PanelShell
      storageKey="sy.sidebar.collapsed.business"
      collapsible={collapsible}
      animateLayout={animateLayout ?? contentPadding !== false}
      title={title ?? currentNav?.label}
      topbarRight={topbarActions}
      topbarExtra={
        topbarRight && !hideActions ? (
          <div className="sticky top-14 z-20 border-b border-border/60 bg-card px-3 py-2 sm:hidden">
            <div className="flex min-w-0 flex-wrap items-center gap-2 overflow-hidden">{topbarRight}</div>
          </div>
        ) : null
      }
      contentPadding={contentPadding}
      contentClassName={contentClassName}
      sidebarTop={(ctx) => (
        <SidebarWorkspaceRow
          name={business.name}
          subtitle={business.categories?.length ? (business.categories as string[]).join(", ") : null}
          logoUrl={business.logo_url}
          collapsed={ctx.collapsed}
        />
      )}
      sidebarNav={(ctx) => (
        <>
          {showGettingStarted && (
            <div className="pb-2">
              <SidebarProgressCard
                icon={Rocket}
                label="Kom godt i gang"
                done={gsDone}
                total={gsTotal}
                active={activeTab === "getting-started"}
                collapsed={ctx.collapsed}
                onClick={() => {
                  const item = findAdminNavItem("getting-started");
                  if (!item) return;
                  ctx.closeDrawer();
                  go(item);
                }}
                onMouseEnter={() => prefetchAdminTab("getting-started")}
                onFocus={() => prefetchAdminTab("getting-started")}
                onTouchStart={() => prefetchAdminTab("getting-started")}
              />
            </div>
          )}
          {ADMIN_NAV_GROUPS.map((group, gi) => {
            const items = ADMIN_NAV_ITEMS.filter((i) => i.group === group.key);
            const anyVisible = items.some((i) => isAdminNavVisible(i, flags));
            // Første gruppe behøver ingen skillelinje når sidebaren er collapsed.
            const showLabel = !(gi === 0 && ctx.collapsed);
            return (
              <SidebarCollapsibleRow key={group.key} visible={anyVisible}>
                <div>
                  {showLabel && (
                    <SidebarGroupLabel collapsed={ctx.collapsed} first={gi === 0 && !showGettingStarted}>
                      {group.label}
                    </SidebarGroupLabel>
                  )}
                  <div className="space-y-0.5">
                    {items.map((item) => (
                      <SidebarCollapsibleRow key={item.value} visible={isAdminNavVisible(item, flags)}>
                        <SidebarNavButton
                          icon={item.icon}
                          label={item.label}
                          active={activeTab === item.value}
                          collapsed={ctx.collapsed}
                          onClick={() => { ctx.closeDrawer(); go(item); }}
                          onMouseEnter={() => prefetchAdminTab(item.value)}
                          onFocus={() => prefetchAdminTab(item.value)}
                          onTouchStart={() => prefetchAdminTab(item.value)}
                        />
                      </SidebarCollapsibleRow>
                    ))}
                  </div>
                </div>
              </SidebarCollapsibleRow>
            );
          })}
        </>
      )}
      sidebarFooter={(ctx) => (
        <>
          {isSoloOwnerEmployee && (
            <RoleSwitchFooterItem
              icon={Truck}
              label="Skift til medarbejder"
              onClick={() => { ctx.closeDrawer(); navigate("/medarbejder"); }}
              collapsed={ctx.collapsed}
            />
          )}
          <SidebarProfileMenu
            name={displayName}
            subtitle={user?.email && user.email !== displayName ? user.email : business.name}
            collapsed={ctx.collapsed}
            items={profileItems}
            fallback="K"
          />
        </>
      )}
      bottomNav={
        <PanelBottomNav
          primary={primaryItems}
          more={moreItems}
          moreTitle="Mere"
          moreFooter={
            <>
              <SidebarFooterItem icon={ExternalLink} label="Se din side" href={`/v/${business.slug}`} collapsed={false} />
              {isSoloOwnerEmployee && (
                <RoleSwitchFooterItem icon={Truck} label="Skift til medarbejder" onClick={() => navigate("/medarbejder")} collapsed={false} />
              )}
              <SidebarFooterItem icon={LogOut} label="Log ud" onClick={signOut} collapsed={false} danger />
            </>
          }
        />
      }
    >
      <ImpersonationBanner />
      <DPAGate businessId={business.id} isOwner={isOwner}>
        {children}
      </DPAGate>
    </PanelShell>
  );
};

export default AdminShell;

/* ImpersonationBanner — vises kun når en platform-admin har indløst en
   5-cifret kode og browser-fanen kører i "log ind som virksomhed"-tilstand.
   Klik på "Stop" fjerner sessionen og genindlæser panelet. */
const ImpersonationBanner = () => {
  if (typeof window === "undefined") return null;
  const id = (() => { try { return window.sessionStorage.getItem("sy.impersonate.business_id"); } catch { return null; } })();
  if (!id) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-warning-foreground dark:text-warning">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-warning motion-reduce:animate-none" />
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

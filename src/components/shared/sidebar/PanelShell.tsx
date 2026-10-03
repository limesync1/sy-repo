// PanelShell — fælles ramme for virksomheds- og medarbejderpanelet (og senere
// PlatformAdmin). Ejer ALT layout-logik ét sted:
//
//  - Desktop (lg+): fast, hvid sidebar der kan foldes sammen til en ikon-stribe.
//  - Mobil/tablet (<lg): sidebaren er en Radix-Sheet-drawer (focus-trap,
//    scroll-lock, ESC, swipe-to-close) + valgfri bundnavigation.
//  - Bredder styres af CSS-variabler (--sidebar-w, --bottomnav-h) på wrapperen,
//    så aside, topbar og indhold ALDRIG kan drive fra hinanden.
//  - Collapse er ren CSS/prop — ingen matchMedia i JS, derfor intet flash.
//
// Shells (AdminShell/EmployeeShell) leverer kun indholdet via render props.
import { Link } from "react-router-dom";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import useSidebarCollapsed from "./useSidebarCollapsed";
import { NavIconGradientDefs, SidebarEdgeHandle } from "./SidebarParts";

export type PanelSidebarContext = {
  /** True når sidebaren vises som ikon-stribe (kun desktop). Altid false i drawer. */
  collapsed: boolean;
  /** True når indholdet rendres i mobil-drawer'en. */
  inDrawer: boolean;
  /** Luk drawer'en (no-op på desktop). Kald før navigation. */
  closeDrawer: () => void;
};

export type PanelShellProps = {
  /** localStorage-nøgle til collapse-præferencen. */
  storageKey: string;
  /** Må sidebaren foldes sammen på desktop? */
  collapsible?: boolean;
  /** Animér bredde-skift. Sæt til false for tunge fuldbredde-sider (fx kalender). */
  animateLayout?: boolean;

  /** Øverst i sidebaren under logoet (virksomheds-/arbejdspladsrække). */
  sidebarTop?: (ctx: PanelSidebarContext) => ReactNode;
  /** Selve navigationen (scroller). */
  sidebarNav: (ctx: PanelSidebarContext) => ReactNode;
  /** Bunden af sidebaren (skift rolle, profil). */
  sidebarFooter?: (ctx: PanelSidebarContext) => ReactNode;

  title: ReactNode;
  subtitle?: ReactNode;
  /** Højre side af topbaren. Forbrugeren styrer selv responsiv synlighed. */
  topbarRight?: ReactNode;
  /** Ekstra række lige under topbaren (fx handlinger på mobil). */
  topbarExtra?: ReactNode;

  /** Bundnavigation til <lg. Når sat reserveres der plads via --bottomnav-h. */
  bottomNav?: ReactNode;

  contentPadding?: boolean;
  contentClassName?: string;
  /** Ekstra klasser på yderste wrapper (fx "employee-panel-workspace isolate"). */
  workspaceClassName?: string;
  /** Indhold lige før <main> (fx bannere der skal ligge øverst). */
  children: ReactNode;
};

const EASE = "ease-[cubic-bezier(0.32,0.72,0,1)]";

const SidebarBody = ({
  ctx, top, nav, footer, onClose,
}: {
  ctx: PanelSidebarContext;
  top?: ReactNode;
  nav: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
}) => {
  const { collapsed, inDrawer } = ctx;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={cn("flex h-14 shrink-0 items-center border-b border-border/60", collapsed ? "justify-center px-0" : "justify-between px-4")}>
        <Link
          to="/"
          aria-label="Forside"
          onClick={onClose}
          className="flex items-center overflow-hidden rounded-md outline-none transition-[background-color,transform] duration-200 ease-out hover:scale-[1.015] hover:bg-secondary/40 focus-visible:ring-2 focus-visible:ring-accent/60 motion-reduce:transform-none"
        >
          {collapsed ? (
            <img src="/serviceydere-ikon.webp" alt="Serviceydere" className="h-8 w-8 rounded-lg object-contain" width={64} height={64} decoding="async" />
          ) : (
            <>
              <img src="/serviceydere-logo-dark.webp" alt="Serviceydere" className="h-8 w-auto dark:hidden" width={1920} height={539} decoding="async" />
              {/* Mørk tilstand: logo med hvid tekst. lazy → hentes kun når det faktisk vises. */}
              <img src="/serviceydere-logo.webp" alt="Serviceydere" className="hidden h-8 w-auto dark:block" width={1920} height={539} decoding="async" loading="lazy" />
            </>
          )}
        </Link>
        {inDrawer && (
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Luk menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {top ? <div className={cn("shrink-0 pt-3", collapsed ? "px-2" : "px-3")}>{top}</div> : null}

      <nav
        aria-label="Hovednavigation"
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain py-2 [scrollbar-width:thin]",
          collapsed ? "px-2" : "px-3",
        )}
      >
        <div className="space-y-0.5">{nav}</div>
      </nav>

      {footer ? (
        <div
          className={cn(
            "shrink-0 space-y-1 border-t border-border/60 pt-3",
            "pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:pb-3",
            collapsed ? "px-2" : "px-3",
          )}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
};

export const PanelShell = ({
  storageKey, collapsible = true, animateLayout = true,
  sidebarTop, sidebarNav, sidebarFooter,
  title, subtitle, topbarRight, topbarExtra, bottomNav,
  contentPadding = true, contentClassName, workspaceClassName, children,
}: PanelShellProps) => {
  const { collapsed: collapsedPref, toggle } = useSidebarCollapsed(storageKey);
  const collapsed = collapsible && collapsedPref;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hasBottomNav = !!bottomNav;

  useEffect(() => {
    document.body.classList.add("service-panel-open");
    return () => document.body.classList.remove("service-panel-open");
  }, []);

  // Vokser vinduet til desktop mens drawer'en er åben, lukker vi den, så
  // scroll-lock og overlay ikke hænger fast.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => { if (mq.matches) setDrawerOpen(false); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Swipe mod venstre lukker drawer'en.
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const desktopCtx: PanelSidebarContext = { collapsed, inDrawer: false, closeDrawer: () => {} };
  const drawerCtx: PanelSidebarContext = { collapsed: false, inDrawer: true, closeDrawer: () => setDrawerOpen(false) };

  return (
    <TooltipProvider delayDuration={200}>
      {/* Gradient-defs til aktive nav-ikoner (.nav-icon-gradient). */}
      <NavIconGradientDefs />
      <div
        data-sidebar={collapsed ? "collapsed" : "expanded"}
        className={cn(
          "service-panel-workspace flex min-h-dvh w-full max-w-full overflow-x-clip bg-secondary/30",
          collapsed ? "[--sidebar-w:68px]" : "[--sidebar-w:224px] 2xl:[--sidebar-w:248px]",
          hasBottomNav ? "[--bottomnav-h:60px] lg:[--bottomnav-h:0px]" : "[--bottomnav-h:0px]",
          workspaceClassName,
        )}
      >
        <a
          href="#panel-content"
          className="sr-only z-[100] rounded-md bg-card px-3 py-2 text-sm font-medium text-foreground shadow-lg focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
        >
          Gå til indhold
        </a>

        {/* Desktop-sidebar. `hidden` (display:none) under lg → kan ikke tabbes til. */}
        <aside
          aria-label="Sidebar"
          className={cn(
            "group/sidebar fixed inset-y-0 left-0 z-40 hidden h-dvh w-[var(--sidebar-w)] flex-col border-r border-border/60 bg-card lg:flex",
            animateLayout && `transition-[width] duration-200 ${EASE} motion-reduce:transition-none`,
          )}
        >
          <SidebarBody
            ctx={desktopCtx}
            top={sidebarTop?.(desktopCtx)}
            nav={sidebarNav(desktopCtx)}
            footer={sidebarFooter?.(desktopCtx)}
          />
          {collapsible && <SidebarEdgeHandle collapsed={collapsed} onToggle={toggle} />}
        </aside>

        {/* Mobil/tablet-drawer — monteres kun når den er åben. */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent
            side="left"
            hideCloseButton
            onTouchStart={(e) => {
              const t = e.touches[0];
              touchStart.current = { x: t.clientX, y: t.clientY };
            }}
            onTouchEnd={(e) => {
              const s = touchStart.current;
              touchStart.current = null;
              if (!s) return;
              const t = e.changedTouches[0];
              if (t.clientX - s.x < -64 && Math.abs(t.clientY - s.y) < 48) setDrawerOpen(false);
            }}
            className="flex w-[86vw] max-w-[320px] flex-col gap-0 border-r border-border/60 bg-card p-0 lg:hidden"
          >
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SheetDescription className="sr-only">Hovednavigation</SheetDescription>
            <SidebarBody
              ctx={drawerCtx}
              top={sidebarTop?.(drawerCtx)}
              nav={sidebarNav(drawerCtx)}
              footer={sidebarFooter?.(drawerCtx)}
              onClose={() => setDrawerOpen(false)}
            />
          </SheetContent>
        </Sheet>

        {/* Indholdskolonne */}
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col overflow-x-clip lg:pl-[var(--sidebar-w)]",
            animateLayout && `transition-[padding-left] duration-200 ${EASE} motion-reduce:transition-none`,
          )}
        >
          <header className="service-panel-topbar sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-card/90 px-3 backdrop-blur supports-[backdrop-filter]:bg-card/75 sm:gap-3 sm:px-6">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent/60 lg:hidden"
              aria-label="Åbn menu"
              aria-haspopup="dialog"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold leading-tight text-foreground sm:text-[17px]">{title}</h1>
              {subtitle ? <p className="hidden truncate text-[11px] text-muted-foreground sm:block">{subtitle}</p> : null}
            </div>
            {topbarRight ? (
              <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">{topbarRight}</div>
            ) : null}
          </header>
          {topbarExtra}

          <main
            id="panel-content"
            tabIndex={-1}
            className={cn(
              "service-panel-content relative z-0 min-w-0 max-w-full flex-1 overflow-x-clip outline-none",
              contentPadding
                ? "px-3 pt-3 pb-[calc(var(--bottomnav-h)+env(safe-area-inset-bottom)+0.75rem)] sm:px-6 sm:pt-6 lg:pb-6"
                : "pb-[calc(var(--bottomnav-h)+env(safe-area-inset-bottom))] lg:pb-0",
              contentClassName,
            )}
          >
            {children}
          </main>

          {bottomNav}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default PanelShell;

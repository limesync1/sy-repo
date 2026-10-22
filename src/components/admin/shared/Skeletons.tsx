import type React from "react";
// Skeletons — fælles loading-skeleton-komponenter for både virksomheds-
// og medarbejderpanelet. Formålet er at give EN ENS loading-oplevelse
// på tværs af alle sider: ingen hop, ingen spinner-blink, ingen tomme
// kort. Hver komponent matcher den endelige layout-struktur så
// brugerens øje "lander" det rigtige sted med det samme.
//
// Alle skeletons bruger den samme `Skeleton`-base fra shadcn så pulse-
// animationen er identisk overalt.
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { readSidebarCollapsed, SIDEBAR_STORAGE_KEYS } from "@/components/shared/sidebar/useSidebarCollapsed";

/* ─────────── PageHeader-skeleton ─────────── */
/** Matcher `<PageHeader title=... description=... action=...>` */
export const PageHeaderSkeleton = ({ withAction = true }: { withAction?: boolean }) => (
  // Matcher PageHeader: flex-wrap så action på mobil kan wrappe under titlen
  // (w-full) og på sm+ ligge i højre side (w-auto). Højde h-9 = PrimaryButton.
  <div className="flex items-start justify-between gap-3 flex-wrap">
    <div className="min-w-0 space-y-2">
      <Skeleton className="h-6 w-44" />
      <Skeleton className="h-3.5 w-60 max-w-[80vw]" />
    </div>
    {withAction && (
      <div className="w-full sm:w-auto sm:shrink-0">
        <Skeleton className="h-9 w-full rounded-md sm:w-44" />
      </div>
    )}
  </div>
);

/* ─────────── StatCard-skeleton ─────────── */
/** Matcher `StatCard` fra `AdminUI.tsx`. */
export const StatCardSkeleton = ({ className }: { className?: string }) => (
  // Matcher StatCard: tydeligt ikon-badge på mobil og desktop, value h-6 → h-7,
  // padding p-3 → p-4. Ikonet sidder til venstre, ikke højre.
  <Card className={cn("service-panel-card rounded-md border-border shadow-sm", className)}>
    <div className="flex items-start gap-2.5 p-3">
      <Skeleton className="h-[3.25rem] w-[3.25rem] shrink-0 rounded-md sm:h-14 sm:w-14" />
      <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-6 w-20 sm:h-7 sm:w-24" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  </Card>
);

/** Grid af stat-kort (default 4 kolonner som de fleste oversigter bruger). */
export const StatGridSkeleton = ({
  count = 4,
  cols = "lg:grid-cols-4",
}: { count?: number; cols?: string }) => (
  <div className={cn("grid grid-cols-2 gap-2.5 sm:gap-3", cols)}>
    {Array.from({ length: count }).map((_, i) => (
      <StatCardSkeleton key={i} />
    ))}
  </div>
);

/* ─────────── List rows / table skeleton ─────────── */
export const ListRowSkeleton = ({
  avatar = true,
  trailing = true,
}: { avatar?: boolean; trailing?: boolean }) => (
  <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
    {avatar && <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />}
    <div className="min-w-0 flex-1 space-y-2">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    {trailing && <Skeleton className="h-7 w-20 rounded-md shrink-0" />}
  </div>
);

/** En kortbaseret liste — fx aftaler, kunder, ansatte, beskeder. */
export const ListCardSkeleton = ({
  rows = 5,
  withHeader = true,
}: { rows?: number; withHeader?: boolean }) => (
  <Card className="service-panel-card rounded-md border-border shadow-sm">
    {withHeader && (
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 sm:px-5">
        <Skeleton className="h-9 w-9 rounded-md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-44" />
        </div>
      </div>
    )}
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <ListRowSkeleton key={i} />
      ))}
    </div>
  </Card>
);

/* ─────────── Table skeleton ─────────── */
export const TableSkeleton = ({
  rows = 6,
  cols = 5,
}: { rows?: number; cols?: number }) => (
  <Card className="service-panel-card overflow-hidden rounded-md border-border shadow-sm">
    <div className="overflow-x-auto">
    <div className="min-w-max">
    {/* Head */}
    <div className="flex items-center gap-3 border-b border-border bg-secondary/30 px-4 py-2.5 sm:px-5">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3", i === 0 ? "w-32" : "w-20")} />
      ))}
    </div>
    {/* Rows */}
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-3 px-4 py-3 sm:px-5">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn("h-3.5", c === 0 ? "w-32" : c === cols - 1 ? "w-16" : "w-24")}
            />
          ))}
        </div>
      ))}
    </div>
    </div>
    </div>
  </Card>
);

/* ─────────── Form / detail skeleton ─────────── */
export const FormSkeleton = ({ fields = 5 }: { fields?: number }) => (
  <Card className="service-panel-card space-y-4 rounded-md border-border p-4 shadow-sm sm:p-5">
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    ))}
    <div className="flex justify-end gap-2 pt-2">
      <Skeleton className="h-10 w-24 rounded-md" />
      <Skeleton className="h-10 w-32 rounded-md" />
    </div>
  </Card>
);

/* ─────────── Chart skeleton ─────────── */
export const ChartSkeleton = ({ height = 240 }: { height?: number }) => (
  <Card className="service-panel-card rounded-md border-border p-4 shadow-sm sm:p-5">
    <div className="mb-4 flex items-end justify-between">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-32" />
      </div>
      <Skeleton className="h-7 w-20 rounded-md" />
    </div>
    <Skeleton className="w-full rounded-md" style={{ height }} />
  </Card>
);

/* ─────────── Page-level skeleton (for sider der venter på data) ─────────── */
/**
 * En hel side i loading-state: header + stats + en stor liste.
 * Bruges ofte ved første mount så indholdet føles "fyldt".
 */
export const PageSkeleton = ({
  withStats = true,
  statsCount = 4,
  rows = 5,
  withFilters = false,
}: { withStats?: boolean; statsCount?: number; rows?: number; withFilters?: boolean }) => (
  <div className="w-full space-y-4 sm:space-y-5">
    <PageHeaderSkeleton />
    {withStats && <StatGridSkeleton count={statsCount} />}
    {withFilters && <FilterBarSkeleton />}
    <ListCardSkeleton rows={rows} />
  </div>
);

/* ─────────── Shell-skeleton (sidebar + topbar + indhold) ─────────── */
/**
 * Bruges som fallback FØR shell-komponenten kan rendere — fx mens
 * `useAuth().loading` stadig er sandt. Erstatter den fuldskærms-spinner
 * (LoadingScreen) der tidligere blinkede et tomt skærmbillede.
 */
type ShellSkeletonVariant = "business" | "employee" | "platform";

const shellSidebarWidth = (variant: ShellSkeletonVariant, collapsed: boolean) => {
  if (collapsed) return "w-[68px]";
  if (variant === "business" || variant === "employee") return "w-[224px] 2xl:w-[248px]";
  return "w-[224px] 2xl:w-[248px]";
};

export const ShellSkeleton = ({
  children,
  variant = "business",
  navigationItems,
}: {
  children?: React.ReactNode;
  variant?: ShellSkeletonVariant;
  navigationItems?: number;
} = {}) => {
  const storageKey = SIDEBAR_STORAGE_KEYS[variant];
  const collapsed = readSidebarCollapsed(storageKey);
  const itemCount = navigationItems ?? (variant === "employee" ? 3 : variant === "platform" ? 12 : 8);

  return (
  <div className="flex min-h-screen bg-secondary/50" data-sidebar-state={collapsed ? "collapsed" : "expanded"}>
    {/* Sidebar */}
    <aside className={cn("hidden shrink-0 flex-col border-r border-border bg-background lg:flex", shellSidebarWidth(variant, collapsed))}>
      <div className={cn("flex h-14 items-center border-b border-border", collapsed ? "justify-center px-2" : "px-4")}>
        <Skeleton className={collapsed ? "h-8 w-8 rounded-lg" : "h-7 w-32"} />
      </div>
      <div className={cn("m-3 flex items-center rounded-md border border-border bg-card", collapsed ? "justify-center p-2" : "gap-2 p-3")}>
        <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
        {!collapsed && <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-16" />
        </div>}
      </div>
      <div className={cn("space-y-1", collapsed ? "px-2" : "px-3")}>
        {Array.from({ length: itemCount }).map((_, i) => (
          <Skeleton key={i} className={cn("h-10 rounded-md", collapsed ? "mx-auto w-10" : "w-full")} />
        ))}
      </div>
    </aside>

    {/* Main */}
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-5 sm:px-6">
        <Skeleton className="h-5 w-40" />
      </header>
      <main className="flex-1 p-4 sm:p-6">
        {children ?? <PageSkeleton />}
      </main>
    </div>
  </div>
  );
};

export { Skeleton };

/* ─────────── Route view skeleton ─────────── */
/**
 * Bruges på /medarbejder/rute/:routeId mens kort + stop-data hentes.
 * Viser den karakteristiske top-bar + map-placeholder + stop-liste,
 * så medarbejderen ikke ser en nøgen spinner på en tom skærm.
 */
export const RouteViewSkeleton = () => (
  <div className="flex min-h-screen flex-col bg-background">
    {/* Top bar */}
    <div className="flex h-14 items-center gap-3 border-b border-border bg-card px-4">
      <Skeleton className="h-9 w-9 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-9 w-24 rounded-lg" />
    </div>
    {/* Map */}
    <Skeleton className="h-[42vh] w-full rounded-none" />
    {/* Stops */}
    <div className="flex-1 space-y-2 p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="rounded-xl border-border/80 p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-7 w-16 rounded-md" />
          </div>
        </Card>
      ))}
    </div>
  </div>
);

/* ─────────── Filter / søge-skeleton ─────────── */
/**
 * Bruges i toppen af lister (Kunder/Leads/Ordrer) FØR data er klar, eller
 * mens en filter-handling kører. Matcher den typiske toolbar med
 * søgefelt + 1-2 select/segmented chips + en handling-knap.
 */
export const FilterBarSkeleton = ({
  withAction = true,
  chips = 2,
}: { withAction?: boolean; chips?: number }) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
    <Skeleton className="h-10 w-full rounded-lg sm:max-w-md" />
  <div className="flex flex-wrap items-center gap-2">
      {Array.from({ length: chips }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-24 rounded-lg" />
      ))}
      {withAction && <Skeleton className="h-9 w-28 rounded-lg" />}
    </div>
  </div>
);

/* ─────────── Dialog skeletons ─────────── */
/**
 * Detalje-skeleton — bruges i Sheets der viser kunde/lead/ordre detaljer:
 * sektioner med små header-labels og rækker med ikon + tekst.
 */
export const DialogDetailsSkeleton = ({ sections = 3 }: { sections?: number }) => (
  <div className="space-y-5">
    {Array.from({ length: sections }).map((_, s) => (
      <div key={s} className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Card className="rounded-xl border-border/80 shadow-sm divide-y divide-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-4 w-4 rounded-sm" />
              <Skeleton className="h-3.5 flex-1" />
            </div>
          ))}
        </Card>
      </div>
    ))}
  </div>
);

/* ─────────── Inline tekst-skeleton (AI udkast, beskeder, beskrivelser) ─────────── */
/**
 * Bruges fx mens AI genererer et lead-svar — i stedet for en spinner viser
 * vi tekst-linjer der pulserer, så feltet føles "fyldt" og brugeren ved at
 * indhold er på vej.
 */
export const InlineTextSkeleton = ({
  lines = 4,
  className,
}: { lines?: number; className?: string }) => (
  <div className={cn("space-y-2", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className={cn(
          "h-3.5",
          i === lines - 1 ? "w-2/3" : i % 2 === 0 ? "w-full" : "w-11/12",
        )}
      />
    ))}
  </div>
);

/* ─────────── Resultatkort-grid (søgeside / katalog) ─────────── */
export const CardGridSkeleton = ({
  count = 8,
  cols = "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
}: { count?: number; cols?: string }) => (
  <div className={cn("grid gap-x-5 gap-y-8", cols)}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="space-y-3">
        <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    ))}
  </div>
);

/** Overblik: samme silhuet ved login, sideindlæsning og datahentning. */
export const DashboardSkeleton = () => (
  <div className="min-w-0 space-y-3 sm:space-y-5" aria-busy="true" aria-label="Indlæser overblik">
    <section className="panel-overview-hero overflow-hidden rounded-md px-4 py-4 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-48 max-w-full bg-background/15" />
          <Skeleton className="h-8 w-72 max-w-full bg-background/20" />
          <Skeleton className="h-4 w-96 max-w-full bg-background/15" />
        </div>
        <div className="flex shrink-0 gap-2"><Skeleton className="h-8 w-28 bg-background/20" /><Skeleton className="h-8 w-28 bg-background/20" /></div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:grid-cols-4 lg:mt-6">
        {[0, 1, 2, 3].map(i => <div key={i} className="min-w-0 space-y-2 rounded-md border border-border bg-card p-3">
          <Skeleton className="h-3 w-24 max-w-full" /><Skeleton className="h-6 w-28 max-w-full" /><Skeleton className="h-3 w-36 max-w-full" />
        </div>)}
      </div>
    </section>
    <div className="grid min-w-0 items-start gap-3 sm:gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.9fr)]">
      <div className="min-w-0 space-y-3 sm:space-y-4">
        <Card className="service-panel-card overflow-hidden rounded-md border-border shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border p-4"><Skeleton className="h-4 w-40" /><Skeleton className="h-8 w-28" /></div>
          <div className="grid grid-cols-2 divide-x divide-border">{[0,1,2,3].map(i => <div key={i} className="min-w-0 space-y-3 border-b border-border p-4 sm:p-5"><div className="flex items-center justify-between gap-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-10 w-10 shrink-0" /></div><Skeleton className="h-7 w-28 max-w-full" /><Skeleton className="h-3 w-full" /></div>)}</div>
          <div className="flex items-center gap-3 p-4"><Skeleton className="h-10 w-10" /><Skeleton className="h-4 w-40" /></div>
        </Card>
        <ListCardSkeleton rows={4} />
      </div>
      <div className="min-w-0 space-y-3 sm:space-y-4"><ListCardSkeleton rows={4} /><FormSkeleton fields={2} /></div>
    </div>
  </div>
);

/** Statistik følger indtjeningsfelt, samlet nøgletalsstribe og aktivitetsliste. */
export const EmployeeStatsSkeleton = ({ withHeader = false }: { withHeader?: boolean }) => (
  <div className="min-w-0 space-y-4 sm:space-y-5" aria-busy="true" aria-label="Indlæser statistik">
    {withHeader && <PageHeaderSkeleton />}
    <Card className="service-panel-card overflow-hidden rounded-md border-border shadow-sm">
      <div className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center sm:p-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4"><Skeleton className="h-16 w-16 shrink-0" /><div className="min-w-0 space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-8 w-40 max-w-full" /><Skeleton className="h-3 w-32 max-w-full" /></div></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-1"><Skeleton className="h-8 w-full sm:w-24" /><Skeleton className="h-8 w-full sm:w-24" /></div>
      </div>
    </Card>
    <div className="grid grid-cols-2 overflow-hidden rounded-md border border-border bg-card shadow-sm lg:grid-cols-5">
      {[0,1,2,3,4].map(i => <div key={i} className={cn("flex min-h-[76px] min-w-0 items-center gap-3 border-b border-border p-3.5 odd:border-r lg:border-b-0 lg:border-r", i === 4 && "col-span-2 border-b-0 odd:border-r-0 lg:col-span-1 lg:border-r-0")}><Skeleton className="h-10 w-10 shrink-0" /><div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-3 w-16 max-w-full" /><Skeleton className="h-5 w-20 max-w-full" /></div></div>)}
    </div>
    <ListCardSkeleton rows={4} />
  </div>
);

export const SettingsSkeleton = () => (
  <div className="min-w-0 space-y-6" aria-busy="true" aria-label="Indlæser indstillinger">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
      <div className="flex min-w-0 items-center gap-4"><Skeleton className="h-12 w-12 shrink-0" /><div className="min-w-0 space-y-2"><Skeleton className="h-7 w-44 max-w-full" /><Skeleton className="h-3.5 w-64 max-w-full" /></div></div><Skeleton className="h-8 w-32" />
    </div>
    <div className="grid items-start gap-6 lg:grid-cols-[224px_minmax(0,1fr)]">
      <div className="hidden space-y-3 lg:block"><Skeleton className="h-16 w-full" />{[0,1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
      <div className="min-w-0 space-y-5"><FormSkeleton fields={3} /><FormSkeleton fields={3} /></div>
    </div>
  </div>
);

export const AccountingSkeleton = () => (
  <div className="min-w-0 space-y-5" aria-busy="true" aria-label="Indlæser regnskab">
    <PageHeaderSkeleton withAction={false} />
    <div className="flex items-start gap-4 rounded-md border border-border bg-card p-4 sm:p-6"><Skeleton className="h-14 w-14 shrink-0" /><div className="min-w-0 flex-1 space-y-3"><Skeleton className="h-5 w-56 max-w-full" /><Skeleton className="h-4 w-full max-w-md" /><Skeleton className="h-8 w-32" /></div></div>
    <div className="grid gap-4 sm:grid-cols-2">{[0,1].map(i => <div key={i} className="space-y-3 rounded-md border border-border bg-card p-5"><Skeleton className="h-12 w-32" /><Skeleton className="h-5 w-24" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-3/4" /><Skeleton className="h-9 w-full" /></div>)}</div>
  </div>
);

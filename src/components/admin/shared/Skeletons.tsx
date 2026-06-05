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
        <Skeleton className="h-9 w-full rounded-lg sm:w-44" />
      </div>
    )}
  </div>
);

/* ─────────── StatCard-skeleton ─────────── */
/** Matcher `StatCard` fra `AdminUI.tsx`. */
export const StatCardSkeleton = ({ className }: { className?: string }) => (
  // Matcher StatCard: ikon-badge h-8 (mobil) → h-10 (sm+), value h-6 → h-7,
  // padding p-3 → p-4. Ikonet sidder til venstre, ikke højre.
  <Card className={cn("rounded-xl border-border shadow-sm", className)}>
    <div className="flex items-start gap-2.5 p-3 sm:gap-3 sm:p-4">
      <Skeleton className="h-8 w-8 shrink-0 rounded-lg sm:h-10 sm:w-10" />
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
  <Card className="rounded-xl border-border/80 shadow-sm">
    {withHeader && (
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 sm:px-5">
        <Skeleton className="h-9 w-9 rounded-lg" />
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
  <Card className="overflow-hidden rounded-xl border-border/80 shadow-sm">
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
  </Card>
);

/* ─────────── Form / detail skeleton ─────────── */
export const FormSkeleton = ({ fields = 5 }: { fields?: number }) => (
  <Card className="rounded-xl border-border/80 p-5 shadow-sm sm:p-6 space-y-4">
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
  <Card className="rounded-xl border-border/80 p-5 shadow-sm sm:p-6">
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
export const ShellSkeleton = () => (
  <div className="flex min-h-screen bg-secondary/50">
    {/* Sidebar */}
    <aside className="hidden w-[248px] shrink-0 flex-col border-r border-border bg-background lg:flex">
      <div className="flex h-14 items-center border-b border-border px-4">
        <Skeleton className="h-7 w-32" />
      </div>
      <div className="m-3 flex items-center gap-2 rounded-xl border border-border bg-card p-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="space-y-1 px-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </aside>

    {/* Main */}
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-5 sm:px-6">
        <Skeleton className="h-5 w-40" />
      </header>
      <main className="flex-1 p-4 sm:p-6">
        <PageSkeleton />
      </main>
    </div>
  </div>
);

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
    <div className="flex items-center gap-2">
      {Array.from({ length: chips }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-24 rounded-lg" />
      ))}
      {withAction && <Skeleton className="h-9 w-28 rounded-lg" />}
    </div>
  </div>
);

/* ─────────── Dialog skeletons ─────────── */
/**
 * Generisk skeleton der matcher en åben Dialog/Sheet med titel + form.
 * Brug i stedet for at vise en blank dialog mens detaljer hentes.
 */
export const DialogFormSkeleton = ({ fields = 5 }: { fields?: number }) => (
  <div className="space-y-5">
    {/* Header */}
    <div className="flex items-start gap-3">
      <Skeleton className="h-12 w-12 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
    {/* Felter */}
    <div className="space-y-3">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      ))}
    </div>
    {/* Footer */}
    <div className="flex justify-end gap-2 pt-2">
      <Skeleton className="h-9 w-24 rounded-md" />
      <Skeleton className="h-9 w-28 rounded-md" />
    </div>
  </div>
);

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
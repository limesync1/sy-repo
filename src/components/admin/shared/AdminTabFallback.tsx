import { lazy, Suspense } from "react";
import { ListCardSkeleton, StatGridSkeleton, PageSkeleton, FormSkeleton, FilterBarSkeleton, PageHeaderSkeleton } from "@/components/admin/shared/Skeletons";

const DashboardSkeleton = lazy(() =>
  import("@/components/admin/DashboardTab").then((m) => ({ default: m.DashboardSkeleton }))
);

/** Læser den aktive fane fra URL'en, så alle indlæsningstrin viser samme silhuet. */
export const tabFromUrl = (): string => {
  if (typeof window === "undefined") return "dashboard";
  return new URLSearchParams(window.location.search).get("tab") || "dashboard";
};

/**
 * TabFallback — vis et skeleton der matcher hver fane mens chunk + data loader.
 * Erstatter den gamle "Indlæser…" tekst, så panelet føles instant og smooth.
 */
export const AdminTabFallback = ({ tab }: { tab: string }) => {
  switch (tab) {
    case "dashboard":
      // Brug den rigtige DashboardSkeleton (med hero-form) så chunk-load og
      // data-load viser samme silhuet — ellers ser brugeren to forskellige
      // skeletons inden indholdet kommer.
      return (
        <Suspense fallback={<div className="h-[60vh]" />}>
          <DashboardSkeleton />
        </Suspense>
      );
    case "leads":
      // Leads: 3 stat-kort, ingen action-knap i headeren.
      return (
        <div className="w-full space-y-4 sm:space-y-5 animate-fade-in">
          <PageHeaderSkeleton withAction={false} />
          <StatGridSkeleton count={3} cols="sm:grid-cols-3" />
          <FilterBarSkeleton chips={2} withAction={false} />
          <ListCardSkeleton rows={6} />
        </div>
      );
    case "customers":
      return (
        <div className="w-full space-y-4 sm:space-y-5 animate-fade-in">
          <PageHeaderSkeleton />
          <StatGridSkeleton count={4} cols="sm:grid-cols-2 lg:grid-cols-4" />
          <FilterBarSkeleton chips={2} />
          <ListCardSkeleton rows={6} />
        </div>
      );
    case "orders":
      // Aftaler bruger 3-kolonne AftaleStatsStrip (ikke 4) — match silhuetten
      // så der ikke er hop når rigtigt indhold rendreres.
      return (
        <div className="w-full space-y-4 sm:space-y-5 animate-fade-in">
          <PageHeaderSkeleton />
          <StatGridSkeleton count={3} cols="lg:grid-cols-3" />
          <FilterBarSkeleton chips={2} withAction={false} />
          <ListCardSkeleton rows={6} />
        </div>
      );
    case "employees":
      // Medarbejdere: header + 4 stat-kort (samme grid som Kunder) + liste.
      return (
        <div className="w-full space-y-4 sm:space-y-5 animate-fade-in">
          <PageHeaderSkeleton />
          <StatGridSkeleton count={4} cols="sm:grid-cols-2 lg:grid-cols-4" />
          <FilterBarSkeleton chips={2} />
          <ListCardSkeleton rows={4} />
        </div>
      );
    case "reviews":
      return (
        <div className="space-y-4 animate-fade-in">
          <PageHeaderSkeleton withAction={false} />
          <StatGridSkeleton count={3} cols="sm:grid-cols-3" />
          <FilterBarSkeleton chips={1} withAction={false} />
          <ListCardSkeleton rows={4} />
        </div>
      );
    case "livechat":
      return (
        <div className="space-y-4 animate-fade-in">
          <PageHeaderSkeleton withAction={false} />
          <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <ListCardSkeleton rows={6} />
            <ListCardSkeleton rows={8} />
          </div>
        </div>
      );
    case "accounting":
      return (
        <div className="space-y-6 animate-fade-in">
          <PageHeaderSkeleton />
          {/* Match AccountingTab's interne loading: hero-banner + 4 udbyder-kort */}
          <div className="rounded-2xl border border-border/80 bg-muted/40 p-6 sm:p-8 h-[140px] animate-pulse" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[180px] rounded-2xl border border-border/80 bg-muted/40 animate-pulse" />
            ))}
          </div>
        </div>
      );
    case "settings":
      // Indstillinger har en custom header (progress-ring + titel + status-pill),
      // ikke en standard PageHeader. Match silhuetten så der ikke er hop.
      return (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-muted/70 animate-pulse" />
              <div className="space-y-2">
                <div className="h-7 w-44 rounded bg-muted/70 animate-pulse" />
                <div className="h-3.5 w-64 rounded bg-muted/70 animate-pulse" />
              </div>
            </div>
            <div className="h-8 w-32 rounded-full bg-muted/70 animate-pulse" />
          </div>
          <FormSkeleton fields={5} />
        </div>
      );
    case "services":
      return (
        <div className="space-y-4 animate-fade-in">
          <PageHeaderSkeleton />
          <StatGridSkeleton count={3} cols="sm:grid-cols-3" />
          <FilterBarSkeleton chips={2} withAction />
          <ListCardSkeleton rows={5} />
        </div>
      );
    default:
      return <PageSkeleton />;
  }
};

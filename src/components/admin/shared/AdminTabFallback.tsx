import { DashboardSkeleton, AccountingSkeleton, SettingsSkeleton, Skeleton, ListCardSkeleton, StatGridSkeleton, PageSkeleton, FormSkeleton, FilterBarSkeleton, PageHeaderSkeleton } from "@/components/admin/shared/Skeletons";

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
      return <DashboardSkeleton />;
    case "leads":
      // Leads: 3 stat-kort, ingen action-knap i headeren.
      return (
        <div className="w-full space-y-4 sm:space-y-5">
          <PageHeaderSkeleton withAction={false} />
          <StatGridSkeleton count={3} cols="sm:grid-cols-3" />
          <FilterBarSkeleton chips={2} withAction={false} />
          <ListCardSkeleton rows={6} />
        </div>
      );
    case "customers":
      return (
        <div className="w-full space-y-4 sm:space-y-5">
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
        <div className="w-full space-y-4 sm:space-y-5">
          <PageHeaderSkeleton />
          <StatGridSkeleton count={3} cols="lg:grid-cols-3" />
          <FilterBarSkeleton chips={2} withAction={false} />
          <ListCardSkeleton rows={6} />
        </div>
      );
    case "employees":
      // Medarbejdere: header + 4 stat-kort (samme grid som Kunder) + liste.
      return (
        <div className="w-full space-y-4 sm:space-y-5">
          <PageHeaderSkeleton />
          <StatGridSkeleton count={4} cols="sm:grid-cols-2 lg:grid-cols-4" />
          <FilterBarSkeleton chips={2} />
          <ListCardSkeleton rows={4} />
        </div>
      );
    case "reviews":
      return (
        <div className="space-y-4">
          <PageHeaderSkeleton withAction={false} />
          <StatGridSkeleton count={3} cols="sm:grid-cols-3" />
          <FilterBarSkeleton chips={1} withAction={false} />
          <ListCardSkeleton rows={4} />
        </div>
      );
    case "livechat":
      return (
        <div className="space-y-4">
          <PageHeaderSkeleton withAction={false} />
          <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <ListCardSkeleton rows={6} />
            <ListCardSkeleton rows={8} />
          </div>
        </div>
      );
    case "accounting":
      return <AccountingSkeleton />;
    case "settings":
      return <SettingsSkeleton />;
    case "getting-started":
      return <div className="space-y-4" aria-busy="true"><PageHeaderSkeleton withAction={false} /><div className="grid gap-4 lg:grid-cols-[224px_minmax(0,1fr)]"><FormSkeleton fields={4} /><Skeleton className="aspect-video w-full" /></div></div>;
    case "services":
      return (
        <div className="space-y-4">
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

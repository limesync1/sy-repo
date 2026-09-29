// Skeleton for ruteplanlæggeren — viser præcis det layout der kommer
// (topbar + aftalepulje + kalender) i muted-blokke i stedet for en spinner,
// så der ikke er hop når data lander. Målene følger de samme breakpoints
// som selve planlæggeren, inkl. den kompakte visning på små laptops.
import { Skeleton } from "@/components/ui/skeleton";

export default function PlannerSkeleton() {
  return (
    <div className="planner-canvas flex h-full w-full flex-col gap-2 p-2 lg:p-3" aria-busy="true">
      {/* Topbar */}
      <div className="planner-toolbar hidden shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1.5 xl:flex 2xl:hidden">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-40 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-16 rounded-md" />
        <Skeleton className="h-9 w-40 rounded-md" />
        <Skeleton className="ml-auto h-8 w-28 rounded-md" />
      </div>

      {/* Mobil/tablet-topbar */}
      <div className="planner-mobile-toolbar shrink-0 space-y-2 rounded-lg border border-border bg-card p-2.5 xl:hidden">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-8 w-8 rounded-[4px]" />
          <div className="flex-1 space-y-1.5 px-2">
            <Skeleton className="mx-auto h-4 w-32" />
            <Skeleton className="mx-auto h-2.5 w-24" />
          </div>
          <Skeleton className="h-8 w-8 rounded-[4px]" />
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] gap-1.5">
          <Skeleton className="h-10 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-[4px]" />
          <Skeleton className="h-8 w-20 rounded-[4px]" />
        </div>
      </div>

      {/* Arbejdsbord */}
      <div className="planner-board grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-md border border-border bg-background xl:grid-cols-[12.5rem_minmax(0,1fr)] xl:[@media(min-width:1440px)]:grid-cols-[15rem_minmax(0,1fr)] 2xl:grid-cols-[22rem_minmax(0,1fr)]">
        {/* Aftaler uden rute */}
        <aside className="hidden min-w-0 flex-col overflow-hidden border-r border-border bg-card xl:flex">
          <div className="planner-inbox-header space-y-3 border-b border-border px-4 pb-3 pt-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
            </div>
            <Skeleton className="h-8 w-full rounded-md" />
            <div className="flex gap-1.5">
              <Skeleton className="h-8 flex-1 rounded-md" />
              <Skeleton className="h-8 flex-1 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
          <div className="flex-1 space-y-2.5 overflow-hidden bg-secondary/25 p-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="space-y-1.5 rounded-md border border-border bg-card p-2.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        </aside>

        {/* Kalender */}
        <main className="flex min-w-0 flex-col overflow-hidden bg-background">
          <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-3 py-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="ml-auto h-4 w-16" />
          </div>
          <div className="hidden shrink-0 border-b border-border bg-card sm:grid" style={{ gridTemplateColumns: "var(--planner-week-col, 44px) repeat(7, minmax(0, 1fr))" }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center justify-center border-r border-border/70 p-2 last:border-r-0">
                <Skeleton className="h-2.5 w-8" />
              </div>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {/* Desktop: 7-kolonners grid. Mobil: agenda-liste. */}
            <div className="hidden h-full sm:block">
              {Array.from({ length: 5 }).map((_, w) => (
                <div
                  key={w}
                  className="grid border-b border-border/70"
                  style={{ gridTemplateColumns: "var(--planner-week-col, 44px) repeat(7, minmax(0, 1fr))" }}
                >
                  <div className="flex justify-center border-r border-border/70 bg-secondary/20 pt-3">
                    <Skeleton className="h-5 w-6 rounded-md" />
                  </div>
                  {Array.from({ length: 7 }).map((_, d) => (
                    <div key={d} className="min-h-[96px] space-y-1.5 border-r border-border p-1.5 last:border-r-0">
                      <Skeleton className="h-5 w-6 rounded-md" />
                      {(w + d) % 3 === 0 && <Skeleton className="h-[68px] w-full rounded-md" />}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="space-y-2 p-2 sm:hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2 rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="ml-auto h-3 w-12" />
                  </div>
                  <Skeleton className="h-14 w-full rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/** Én fælles helsides-silhuet for ruteplanlæggeren (bruges af både
 *  kode-indlæsning, login-tjek og virksomhedsopslag, så der kun ses én). */
export const PlannerPageSkeleton = () => (
  <div className="flex min-h-screen bg-background" aria-busy="true" aria-label="Indlæser">
    <div className="hidden w-60 shrink-0 border-r border-border bg-muted/40 p-4 lg:block">
      <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
      <div className="mt-6 space-y-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-8 w-full animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    </div>
    <div className="route-planner-workspace min-w-0 flex-1">
      <div className="h-14 border-b border-border bg-card" />
      <div className="h-[calc(100vh-3.5rem)]"><PlannerSkeleton /></div>
    </div>
  </div>
);

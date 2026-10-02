import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Én fælles silhuet for "Min dag" — samme form under hele indlæsningen. */
export function MinDagSkeleton() {
  return (
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-2" aria-busy="true" aria-label="Indlæser">
      {[0, 1].map((i) => (
        <Card key={i} className="service-panel-card overflow-hidden rounded-[5px] border-border shadow-sm">
          <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 sm:px-5">
            <Skeleton className="h-14 w-14 rounded-[4px]" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-8 rounded-[4px]" />
          </div>
          <div className="space-y-3 p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-2 rounded-[4px] border border-border p-2.5">
              <Skeleton className="h-8 w-full rounded-[4px]" />
              <Skeleton className="h-8 w-full rounded-[4px]" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-[4px]" />
              <Skeleton className="h-10 w-full rounded-[4px]" />
            </div>
            <Skeleton className="h-11 w-full rounded-[4px]" />
          </div>
        </Card>
      ))}
    </div>
  );
}

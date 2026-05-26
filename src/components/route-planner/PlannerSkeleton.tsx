// Skeleton for ruteplanlæggeren — viser layoutet (sidebar + kalender) i
// muted-blokke i stedet for en spinner. Læseren får følelsen af at noget
// er på vej og ser ikke et tomt vindue.
import { Skeleton } from "@/components/ui/skeleton";

export default function PlannerSkeleton() {
  return (
    <div className="flex h-full w-full gap-3 p-3" aria-busy="true">
      <div className="hidden lg:flex w-72 shrink-0 flex-col gap-2 rounded-md border border-border bg-card p-3">
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-9 w-full" />
        <div className="space-y-2 mt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-md border border-border p-2 space-y-1.5">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-2 rounded-md border border-border bg-card p-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-7 w-32" />
        </div>
        <div className="grid grid-cols-7 gap-1.5 flex-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="min-h-[90px]" />
          ))}
        </div>
      </div>
    </div>
  );
}
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { PageHeader, EmptyState, SearchInput } from "@/components/admin/shared/AdminUI";
import { StatGridSkeleton, ListCardSkeleton } from "@/components/admin/shared/Skeletons";

interface Props {
  reviews: any[];
  isLoading: boolean;
}

const ReviewsTab = ({ reviews, isLoading }: Props) => {
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<"all" | 1 | 2 | 3 | 4 | 5>("all");

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  const verifiedCount = reviews.filter((r) => r.is_verified).length;

  const filtered = useMemo(() => {
    let list = reviews;
    if (ratingFilter !== "all") list = list.filter((r) => r.rating === ratingFilter);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((r) =>
      (r.reviewer_name || "").toLowerCase().includes(q) ||
      (r.comment || "").toLowerCase().includes(q),
    );
  }, [reviews, search, ratingFilter]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Anmeldelser" description="Henter anmeldelser…" />
        <StatGridSkeleton count={3} cols="sm:grid-cols-3" />
        <ListCardSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Anmeldelser"
        description={`${reviews.length} anmeldelser i alt — det her ser dine kunder på virksomhedens side.`}
      />

      {/* Kompakt stat-stribe + filter — alt på én linje hvor det er muligt. */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
          <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 p-3 sm:p-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">I alt</p>
              <p className="text-lg font-semibold tabular-nums text-foreground">{reviews.length}</p>
            </div>
            <div className="h-8 w-px bg-border" aria-hidden />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Gennemsnit</p>
              <div className="flex items-center gap-1.5">
                <p className="text-lg font-semibold tabular-nums text-foreground">
                  {reviews.length > 0 ? avgRating.toFixed(1) : "—"}
                </p>
                {reviews.length > 0 && (
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`h-3 w-3 ${s <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-border"}`} />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="h-8 w-px bg-border" aria-hidden />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Verificerede</p>
              <p className="text-lg font-semibold tabular-nums text-foreground">{verifiedCount}</p>
            </div>
            {reviews.length > 0 && (
              <>
                <div className="hidden h-8 w-px bg-border sm:block" aria-hidden />
                <div className="hidden min-w-[160px] flex-1 sm:block">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Fordeling</p>
                  <div className="flex h-1.5 overflow-hidden rounded-full bg-secondary">
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count = reviews.filter((r) => r.rating === rating).length;
                      if (count === 0) return null;
                      const pct = (count / reviews.length) * 100;
                      const color = rating >= 4 ? "bg-emerald-500" : rating === 3 ? "bg-amber-400" : "bg-rose-400";
                      return <div key={rating} className={`h-full ${color}`} style={{ width: `${pct}%` }} title={`${rating}★ · ${count}`} />;
                    })}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-1 lg:justify-end">
          {([
            { key: "all" as const, label: "Alle", count: reviews.length },
            { key: 5 as const, label: "5 ★", count: reviews.filter(r => r.rating === 5).length },
            { key: 4 as const, label: "4 ★", count: reviews.filter(r => r.rating === 4).length },
            { key: 3 as const, label: "3 ★", count: reviews.filter(r => r.rating === 3).length },
            { key: 2 as const, label: "2 ★", count: reviews.filter(r => r.rating === 2).length },
            { key: 1 as const, label: "1 ★", count: reviews.filter(r => r.rating === 1).length },
          ]).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setRatingFilter(key)}
              className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                ratingFilter === key
                  ? "border-foreground/30 bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`ml-1.5 rounded px-1 text-[10px] font-semibold tabular-nums ${
                  ratingFilter === key ? "bg-background/20" : "bg-secondary text-foreground/70"
                }`}>{count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Søgefelt */}
      <div className="flex items-center gap-2 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Søg anmelder eller kommentar..." />
      </div>

      {/* Liste — ét stort kort med header-bar og rækker adskilt af divide-y */}
      {reviews.length === 0 ? (
        <EmptyState
          icon={<Star />}
          title="Ingen anmeldelser endnu"
          description="Anmeldelser vises her når kunder bedømmer din virksomhed."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Star />}
          title="Ingen anmeldelser matcher"
          description="Prøv et andet søgeord eller skift filter."
        />
      ) : (
        <Card className="surface-admin rounded-xl border-border/80 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 sm:px-4">
            <div className="min-w-0">
              <h3 className="text-xs font-semibold text-foreground">
                {ratingFilter === "all" ? "Alle anmeldelser" : `${ratingFilter}-stjernede anmeldelser`}
                <span className="ml-1.5 font-normal text-muted-foreground">· {filtered.length}</span>
              </h3>
            </div>
          </div>
          <div className="divide-y divide-border">
            {filtered.map((review) => (
              <div
                key={review.id}
                className="px-3 py-2.5 transition-colors hover:bg-secondary/60 sm:px-4"
              >
                <div className="flex items-start gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-foreground border border-border">
                    {(review.reviewer_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <h3 className="text-xs font-semibold text-foreground truncate">{review.reviewer_name}</h3>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className={`h-3 w-3 ${star <= review.rating ? "fill-amber-400 text-amber-400" : "text-border"}`} />
                        ))}
                      </div>
                      {review.is_verified && (
                        <span className="inline-flex items-center gap-1 rounded text-[10px] font-medium text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Verificeret
                        </span>
                      )}
                      <span className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(review.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="mt-1 text-[13px] text-foreground/85 leading-snug">{review.comment}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ReviewsTab;

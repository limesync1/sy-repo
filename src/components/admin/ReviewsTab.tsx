import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Star, ShieldCheck, BarChart3 } from "lucide-react";
import { PageHeader, EmptyState, SearchInput, StatCard } from "@/components/admin/shared/AdminUI";
import { StatGridSkeleton, ListCardSkeleton, PageHeaderSkeleton, Skeleton } from "@/components/admin/shared/Skeletons";
import { useAdaptivePageSize } from "@/hooks/useAdaptivePageSize";
import { PaginationFooter } from "@/components/admin/shared/PaginationFooter";
import { BrandedIllustration } from "@/components/shared/BrandedIllustration";
import { Button } from "@/components/ui/button";

interface Props {
  reviews: any[];
  isLoading: boolean;
}

const ReviewsTab = ({ reviews, isLoading }: Props) => {
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<"all" | 1 | 2 | 3 | 4 | 5>("all");

  // Memoiseret samlet aggregat — én pass over reviews i stedet for 8.
  const aggregate = useMemo(() => {
    let sum = 0;
    let verified = 0;
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of reviews) {
      sum += r.rating || 0;
      if (r.is_verified) verified += 1;
      if (r.rating >= 1 && r.rating <= 5) counts[r.rating] += 1;
    }
    return {
      avg: reviews.length > 0 ? sum / reviews.length : 0,
      verified,
      counts,
    };
  }, [reviews]);
  const avgRating = aggregate.avg;
  const verifiedCount = aggregate.verified;

  const filtered = useMemo(() => {
    let list = reviews;
    if (ratingFilter !== "all") list = list.filter((r) => r.rating === ratingFilter);
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter((r) =>
      (r.reviewer_name || "").toLowerCase().includes(q) ||
      (r.comment || "").toLowerCase().includes(q),
    );
  }, [reviews, search, ratingFilter]);

  const pageSize = useAdaptivePageSize(25);
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [search, ratingFilter, reviews.length]);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeaderSkeleton withAction={false} />
        <StatGridSkeleton count={3} cols="sm:grid-cols-3" />
        {/* Filter-chip-rækken vises også her så indholdet ikke hopper når data lander. */}
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-3 w-16" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-14" />
          ))}
        </div>
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

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="I alt" value={reviews.length} icon={<BrandedIllustration name="reviewCount" />} />
        <StatCard
          label="Gennemsnit"
          value={
            <span className="inline-flex items-center gap-1.5">
              {reviews.length > 0 ? avgRating.toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—"}
              {reviews.length > 0 && (
                <span className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} aria-hidden="true" className={`h-3.5 w-3.5 ${s <= Math.round(avgRating) ? "fill-warning text-warning" : "text-border"}`} />
                  ))}
                </span>
              )}
            </span>
          }
          hint={reviews.length > 0 ? `Baseret på ${reviews.length} anmeldelse${reviews.length === 1 ? "" : "r"}` : undefined}
          icon={<BrandedIllustration name="reviewAverage" />}
          tone="amber"
        />
        <StatCard label="Verificerede" value={verifiedCount} hint="Markeret som ægte" icon={<BrandedIllustration name="verifiedReviews" />} tone="ok" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground mr-1">Bedømmelse</span>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Bedømmelse">
          {([
            { key: "all" as const, label: "Alle", count: reviews.length },
            { key: 5 as const, label: "5 ★", count: aggregate.counts[5] },
            { key: 4 as const, label: "4 ★", count: aggregate.counts[4] },
            { key: 3 as const, label: "3 ★", count: aggregate.counts[3] },
            { key: 2 as const, label: "2 ★", count: aggregate.counts[2] },
            { key: 1 as const, label: "1 ★", count: aggregate.counts[1] },
          ]).map(({ key, label, count }) => (
            <Button
              type="button"
              variant={ratingFilter === key ? "default" : "outline"}
              key={key}
              aria-pressed={ratingFilter === key}
              aria-label={key === "all" ? `Alle anmeldelser (${count})` : `${key} stjerner (${count})`}
              onClick={() => setRatingFilter(key)}
              className="min-h-11 gap-1.5 px-3 text-sm"
            >
              {label}
              {count > 0 && (
                <span className={`rounded px-1 text-xs font-semibold tabular-nums ${
                  ratingFilter === key ? "bg-background/20" : "bg-secondary text-foreground/70"
                }`}>{count}</span>
              )}
            </Button>
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
              <h3 className="text-sm font-semibold text-foreground">
                {ratingFilter === "all" ? "Alle anmeldelser" : `${ratingFilter}-stjernede anmeldelser`}
                <span className="ml-1.5 font-normal text-muted-foreground">· {filtered.length}</span>
              </h3>
            </div>
          </div>
          <div className="divide-y divide-border">
            {paged.map((review) => (
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
                      <h3 className="min-w-0 max-w-full break-words text-sm font-semibold text-foreground">{review.reviewer_name || "Anonym kunde"}</h3>
                      <div className="flex shrink-0 items-center gap-0.5" role="img" aria-label={`${review.rating} af 5 stjerner`}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} aria-hidden="true" className={`h-3.5 w-3.5 ${star <= review.rating ? "fill-warning text-warning" : "text-border"}`} />
                        ))}
                      </div>
                      {review.is_verified && (
                        <span className="inline-flex items-center gap-1 rounded text-xs font-medium text-success">
                          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          Verificeret
                        </span>
                      )}
                      <span className="w-full text-xs text-muted-foreground sm:ml-auto sm:w-auto">
                        {new Date(review.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground leading-relaxed [overflow-wrap:anywhere]">{review.comment}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-3 sm:px-4 py-3">
            <PaginationFooter
              page={page}
              pageSize={pageSize}
              total={filtered.length}
              onPageChange={setPage}
              label="anmeldelser"
            />
          </div>
        </Card>
      )}
    </div>
  );
};

export default ReviewsTab;

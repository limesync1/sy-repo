import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare } from "lucide-react";
import { PageHeader, EmptyState, SearchInput } from "@/components/admin/shared/AdminUI";

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
        <PageHeader title="Anmeldelser" description="Indlæser anmeldelser..." />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-secondary/40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Anmeldelser"
        description={`${reviews.length} anmeldelser i alt — det her ser dine kunder på virksomhedens side.`}
      />

      {/* Stats + filter — samme layout som Kunder/Aftaler/Medarbejdere */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Anmeldelser i alt</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{reviews.length}</p>
            </CardContent>
          </Card>
          <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Gennemsnit</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-2xl font-semibold tabular-nums text-foreground">
                  {reviews.length > 0 ? avgRating.toFixed(1) : "—"}
                </p>
                {reviews.length > 0 && (
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-border"}`} />
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Verificerede</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{verifiedCount}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
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
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                ratingFilter === key
                  ? "border-border bg-secondary text-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {label}
              {count > 0 && <span className="ml-1.5 tabular-nums">{count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Søgefelt */}
      <div className="flex items-center gap-2 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Søg anmelder eller kommentar..." />
      </div>

      {/* Rating-fordeling — kun hvis der findes anmeldelser */}
      {reviews.length > 0 && (
        <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Fordeling af bedømmelser</h3>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = reviews.filter((r) => r.rating === rating).length;
                const pct = (count / reviews.length) * 100;
                return (
                  <div key={rating} className="flex items-center gap-3 text-sm">
                    <div className="flex w-8 items-center justify-end gap-0.5">
                      <span className="text-muted-foreground tabular-nums">{rating}</span>
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    </div>
                    <div className="h-2.5 flex-1 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm font-medium text-foreground tabular-nums">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">
                {ratingFilter === "all" ? "Alle anmeldelser" : `${ratingFilter}-stjernede anmeldelser`}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? "anmeldelse" : "anmeldelser"}
              </p>
            </div>
          </div>
          <div className="divide-y divide-border">
            {filtered.map((review) => (
              <div
                key={review.id}
                className="px-4 py-3 transition-colors hover:bg-secondary/60 sm:px-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-foreground border border-border">
                      {(review.reviewer_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground truncate">{review.reviewer_name}</h3>
                        {review.is_verified && (
                          <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0 h-5 border-border bg-secondary text-foreground gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Verificeret
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className={`h-3.5 w-3.5 ${star <= review.rating ? "fill-amber-400 text-amber-400" : "text-border"}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {new Date(review.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                {review.comment && (
                  <div className="mt-2 flex gap-2 pl-[52px]">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/50 mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground/85 leading-relaxed">{review.comment}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ReviewsTab;

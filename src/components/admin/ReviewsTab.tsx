import { Badge } from "@/components/ui/badge";
import { MessageSquare, ShieldCheck, Star } from "lucide-react";
import { AppList, AppListRow, EmptyState, InsightPill, PageHeader, SectionCard, StatCard } from "@/components/admin/shared/AdminUI";

interface Props {
  reviews: any[];
  isLoading: boolean;
}

const ReviewsTab = ({ reviews, isLoading }: Props) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
        Indlæser anmeldelser...
      </div>
    );
  }

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const verifiedCount = reviews.filter((review) => review.is_verified).length;
  const latestReview = reviews[0];
  const distribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((review) => review.rating === rating).length,
  }));

  return (
    <div className="space-y-4.5">
      <PageHeader
        eyebrow="Forretning"
        title="Anmeldelser"
        description="Overblik over score, verificering og seneste feedback i samme driftsformat som resten af panelet."
      />

      <div className="grid gap-2 md:grid-cols-3">
        <StatCard label="Gennemsnit" value={reviews.length ? avgRating.toFixed(1) : "—"} icon={<Star />} tone="amber" hint={reviews.length ? `${reviews.length} anmeldelser` : "Ingen anmeldelser endnu"} />
        <StatCard label="Verificerede" value={verifiedCount} icon={<ShieldCheck />} tone="emerald" hint={reviews.length ? `${Math.round((verifiedCount / reviews.length) * 100)}% af alle anmeldelser` : "Afventer data"} />
        <StatCard label="Seneste" value={latestReview ? new Date(latestReview.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short" }) : "—"} icon={<MessageSquare />} tone="blue" hint={latestReview?.reviewer_name || "Ingen ny feedback"} />
      </div>

      {reviews.length > 0 && (
        <SectionCard title="Fordeling" description="Se hurtigt hvor anmeldelserne samler sig.">
          <div className="space-y-2">
            {distribution.map(({ rating, count }) => {
              const pct = reviews.length ? (count / reviews.length) * 100 : 0;
              return (
                <div key={rating} className="grid grid-cols-[44px_minmax(0,1fr)_40px] items-center gap-3 text-[11px]">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span className="tabular-nums">{rating}</span>
                    <Star className="h-3 w-3 fill-foreground text-foreground" />
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-foreground" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-right font-medium tabular-nums text-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {reviews.length === 0 ? (
        <EmptyState
          icon={<Star />}
          title="Ingen anmeldelser endnu"
          description="Anmeldelser vises her, når kunder bedømmer din virksomhed."
        />
      ) : (
        <SectionCard title="Seneste anmeldelser" description="Brug feedbacken som driftsinput, ikke som marketingkort.">
          <AppList>
            <div className="grid grid-cols-[minmax(0,1.3fr)_auto_auto] gap-3 admin-list-header px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <span>Feedback</span>
              <span>Score</span>
              <span>Dato</span>
            </div>
            {reviews.map((review) => (
              <AppListRow key={review.id} className="items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{review.reviewer_name}</p>
                    {review.is_verified && (
                      <Badge variant="outline" className="h-5 rounded-md border-border bg-background px-1.5 text-[10px] font-medium text-muted-foreground">
                        Verificeret
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{review.comment || "Ingen kommentar"}</p>
                </div>
                <div className="hidden sm:flex sm:min-w-[92px] sm:justify-center">
                  <InsightPill>
                    <Star className="h-3 w-3 fill-foreground text-foreground" />
                    {review.rating.toFixed(1)}
                  </InsightPill>
                </div>
                <div className="min-w-[72px] text-right text-[11px] text-muted-foreground">
                  {new Date(review.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </AppListRow>
            ))}
          </AppList>
        </SectionCard>
      )}
    </div>
  );
};

export default ReviewsTab;

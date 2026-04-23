import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/admin/shared/AdminUI";

interface Props {
  reviews: any[];
  isLoading: boolean;
}

const ReviewsTab = ({ reviews, isLoading }: Props) => {
  if (isLoading) return (
    <div className="flex items-center gap-2 py-8 justify-center text-sm text-muted-foreground">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
      Indlæser anmeldelser...
    </div>
  );

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Forretning"
        title="Anmeldelser"
        description={`${reviews.length} anmeldelser i alt — brug dem til at forstå kundernes oplevelse og styrke tilliden på din profil.`}
        action={reviews.length > 0 ? (
          <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-2 shadow-sm h-9">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className={`h-4 w-4 ${star <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-border"}`} />
              ))}
            </div>
            <span className="text-base font-bold text-foreground tabular-nums">{avgRating.toFixed(1)}</span>
          </div>
        ) : null}
      />

      {/* Rating breakdown */}
      {reviews.length > 0 && (
        <Card className="rounded-lg border-border shadow-sm">
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Fordeling</h3>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = reviews.filter((r) => r.rating === rating).length;
                const pct = (count / reviews.length) * 100;
                return (
                  <div key={rating} className="flex items-center gap-3 text-xs">
                    <div className="flex w-8 items-center justify-end gap-0.5">
                      <span className="text-muted-foreground tabular-nums">{rating}</span>
                      <Star className="h-3 w-3 fill-foreground text-foreground" />
                    </div>
                    <div className="h-2.5 flex-1 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-foreground transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs font-medium text-foreground tabular-nums">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review list */}
      <div className="space-y-3">
        {reviews.map((review) => (
          <Card key={review.id} className="rounded-lg border-border shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-xs font-bold text-foreground">
                    {review.reviewer_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{review.reviewer_name}</h3>
                      {review.is_verified && (
                        <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0 border-border bg-background text-muted-foreground">
                          Verificeret
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className={`h-3.5 w-3.5 ${star <= review.rating ? "fill-foreground text-foreground" : "text-border"}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(review.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              {review.comment && (
                <div className="mt-3 flex gap-2.5 pl-[48px]">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/40 mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground/85 leading-6">{review.comment}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {reviews.length === 0 && (
          <EmptyState
            icon={<Star />}
            title="Ingen anmeldelser endnu"
            description="Anmeldelser vises her når kunder bedømmer din virksomhed."
          />
        )}
      </div>
    </div>
  );
};

export default ReviewsTab;

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare } from "lucide-react";

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Anmeldelser</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{reviews.length} anmeldelser i alt</p>
        </div>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className={`h-4 w-4 ${star <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-border"}`} />
              ))}
            </div>
            <span className="text-base font-bold text-foreground tabular-nums">{avgRating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Rating breakdown */}
      {reviews.length > 0 && (
        <Card className="rounded-xl border-border shadow-sm">
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Fordeling</h3>
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

      {/* Review list */}
      <div className="space-y-3">
        {reviews.map((review) => (
          <Card key={review.id} className="rounded-xl border-border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                    {review.reviewer_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{review.reviewer_name}</h3>
                      {review.is_verified && (
                        <Badge variant="secondary" className="text-[11px] font-medium px-1.5 py-0 bg-accent/10 text-accent border-0">
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
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(review.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              {review.comment && (
                <div className="mt-3 flex gap-2.5 pl-[52px]">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/40 mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground/85 leading-relaxed">{review.comment}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {reviews.length === 0 && (
          <Card className="rounded-xl border-dashed border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
                <Star className="h-7 w-7 text-muted-foreground/25" />
              </div>
              <p className="text-sm font-medium text-foreground">Ingen anmeldelser endnu</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-xs text-center">Anmeldelser vises her når kunder bedømmer din virksomhed.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ReviewsTab;

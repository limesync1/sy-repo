import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

interface Props {
  reviews: any[];
  isLoading: boolean;
}

const ReviewsTab = ({ reviews, isLoading }: Props) => {
  if (isLoading) return <p className="text-muted-foreground">Indlæser anmeldelser...</p>;

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Anmeldelser</h2>
          <p className="text-sm text-muted-foreground">{reviews.length} anmeldelser i alt</p>
        </div>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-2.5">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${star <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-border"}`}
                />
              ))}
            </div>
            <span className="text-lg font-bold text-foreground">{avgRating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Rating breakdown */}
      {reviews.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Fordeling</h3>
            <div className="space-y-2.5">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = reviews.filter((r) => r.rating === rating).length;
                const pct = (count / reviews.length) * 100;
                return (
                  <div key={rating} className="flex items-center gap-3 text-sm">
                    <span className="w-8 text-right text-muted-foreground">{rating} ★</span>
                    <div className="h-2.5 flex-1 rounded-full bg-muted">
                      <div className="h-2.5 rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-10 text-right text-muted-foreground">{count}</span>
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
          <Card key={review.id} className="transition-shadow hover:shadow-md">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                    {review.reviewer_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{review.reviewer_name}</h3>
                      {review.is_verified && <Badge variant="secondary" className="text-xs font-normal">Verificeret</Badge>}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3.5 w-3.5 ${star <= review.rating ? "fill-amber-400 text-amber-400" : "text-border"}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(review.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              {review.comment && <p className="mt-3 text-sm text-foreground/90 leading-relaxed">{review.comment}</p>}
            </CardContent>
          </Card>
        ))}
        {reviews.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 rounded-xl bg-muted p-3">
                <Star className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="font-medium text-foreground">Ingen anmeldelser endnu</p>
              <p className="mt-1 text-sm text-muted-foreground">Anmeldelser vises her når kunder bedømmer din virksomhed.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ReviewsTab;

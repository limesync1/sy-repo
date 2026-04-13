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
        <h2 className="text-xl font-bold text-foreground">Anmeldelser ({reviews.length})</h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-5 w-5 ${star <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-border"}`}
                />
              ))}
            </div>
            <span className="text-lg font-bold text-foreground">{avgRating.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">({reviews.length})</span>
          </div>
        )}
      </div>

      {/* Rating breakdown */}
      {reviews.length > 0 && (
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = reviews.filter((r) => r.rating === rating).length;
                const pct = (count / reviews.length) * 100;
                return (
                  <div key={rating} className="flex items-center gap-3 text-sm">
                    <span className="w-6 text-right text-muted-foreground">{rating}★</span>
                    <div className="h-2 flex-1 rounded-full bg-secondary">
                      <div className="h-2 rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-right text-muted-foreground">{count}</span>
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
          <Card key={review.id} className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{review.reviewer_name}</h3>
                    {review.is_verified && <Badge variant="secondary" className="text-xs">Verificeret</Badge>}
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3.5 w-3.5 ${star <= review.rating ? "fill-amber-400 text-amber-400" : "text-border"}`}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(review.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              {review.comment && <p className="mt-2 text-sm text-foreground">{review.comment}</p>}
            </CardContent>
          </Card>
        ))}
        {reviews.length === 0 && (
          <div className="py-12 text-center">
            <Star className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-muted-foreground">Ingen anmeldelser endnu.</p>
            <p className="text-sm text-muted-foreground">Anmeldelser vises her, når kunder bedømmer din virksomhed.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsTab;

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

interface Props {
  reviews: any[];
  isLoading: boolean;
}

const ReviewsTab = ({ reviews, isLoading }: Props) => {
  if (isLoading) return <p className="text-sm text-muted-foreground">Indlæser anmeldelser...</p>;

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Anmeldelser</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{reviews.length} anmeldelser i alt</p>
        </div>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-[#e1e3e5] bg-white px-3 py-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className={`h-3.5 w-3.5 ${star <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-[#e1e3e5]"}`} />
              ))}
            </div>
            <span className="text-[14px] font-semibold text-foreground">{avgRating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Rating breakdown */}
      {reviews.length > 0 && (
        <Card className="rounded-xl shadow-sm border-[#e1e3e5]">
          <CardContent className="p-4">
            <h3 className="mb-2.5 text-sm font-semibold text-foreground">Fordeling</h3>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = reviews.filter((r) => r.rating === rating).length;
                const pct = (count / reviews.length) * 100;
                return (
                  <div key={rating} className="flex items-center gap-2.5 text-sm">
                    <span className="w-6 text-right text-muted-foreground">{rating}★</span>
                    <div className="h-2 flex-1 rounded-full bg-muted">
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
      <div className="space-y-2.5">
        {reviews.map((review) => (
          <Card key={review.id} className="rounded-xl shadow-sm border-[#e1e3e5]">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                    {review.reviewer_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-semibold text-foreground">{review.reviewer_name}</h3>
                      {review.is_verified && <Badge variant="secondary" className="text-xs font-normal px-1.5 py-0">Verificeret</Badge>}
                    </div>
                    <div className="mt-0.5 flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className={`h-3 w-3 ${star <= review.rating ? "fill-amber-400 text-amber-400" : "text-[#e1e3e5]"}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(review.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              {review.comment && <p className="mt-2.5 text-sm text-foreground/85 leading-relaxed">{review.comment}</p>}
            </CardContent>
          </Card>
        ))}
        {reviews.length === 0 && (
          <Card className="rounded-xl border-dashed border-[#e1e3e5]">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="mb-3 rounded-xl bg-muted p-2.5">
                <Star className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-foreground">Ingen anmeldelser endnu</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Anmeldelser vises her når kunder bedømmer din virksomhed.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ReviewsTab;

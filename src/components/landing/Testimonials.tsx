import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";
import { Link } from "react-router-dom";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  reviewer_name: string;
  created_at: string;
  businesses: { name: string; slug: string } | null;
};

const Stars = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {Array.from({ length: 5 }).map((_, idx) => (
      <Star
        key={idx}
        className={`h-3.5 w-3.5 ${idx < rating ? "fill-foreground text-foreground" : "text-muted-foreground/20"}`}
      />
    ))}
  </div>
);

const Testimonials = () => {
  const { data: reviews } = useQuery({
    queryKey: ["landing-testimonials"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select(
          "id, rating, comment, reviewer_name, created_at, businesses(name, slug)",
        )
        .gte("rating", 4)
        .not("comment", "is", null)
        .order("created_at", { ascending: false })
        .limit(12);
      return (
        (data as unknown as Review[])?.filter(
          (r) => r.comment && r.comment.length > 20,
        ) ?? []
      );
    },
    staleTime: 1000 * 60 * 5,
  });

  if (!reviews || reviews.length === 0) return null;

  const lead = reviews[0];
  const sideReviews = reviews.slice(1, 5);

  return (
    <section className="bg-secondary/45 py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Anmeldelser
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Hvad kunder faktisk siger efter de har valgt.
            </h2>
          </div>
          <div className="text-sm text-muted-foreground">
            Udpluk af nyere oplevelser på platformen
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
          <article className="rounded-[36px] bg-background px-6 py-7 shadow-sm sm:px-7 sm:py-8">
            <Stars rating={lead.rating} />
            <blockquote className="mt-6 text-2xl font-semibold leading-[1.35] tracking-tight text-foreground sm:text-[2rem]">
              “{lead.comment}”
            </blockquote>
            <div className="mt-8 border-t border-border pt-5">
              <div className="text-base font-semibold text-foreground">
                {lead.reviewer_name}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Bekræftet kundeanmeldelse
              </div>
              {lead.businesses && (
                <Link
                  to={`/b/${lead.businesses.slug}`}
                  className="mt-2 inline-flex text-sm text-foreground transition-opacity hover:opacity-80"
                >
                  om {lead.businesses.name}
                </Link>
              )}
            </div>
          </article>

          <div className="space-y-0 border-t border-border bg-background">
            {sideReviews.map((review, index) => (
              <article
                key={review.id}
                className={`grid gap-4 py-5 sm:grid-cols-[120px_minmax(0,1fr)] ${index > 0 ? "border-t border-border" : ""}`}
              >
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {review.reviewer_name}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Kundeanmeldelse
                  </div>
                </div>
                <div>
                  <Stars rating={review.rating} />
                  <p className="mt-3 text-sm leading-7 text-foreground">
                    “{review.comment}”
                  </p>
                  {review.businesses && (
                    <Link
                      to={`/b/${review.businesses.slug}`}
                      className="mt-3 inline-flex text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      om {review.businesses.name}
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;

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
  const sideReviews = reviews.slice(1, 4);

  return (
    <section className="border-t border-border bg-secondary/35 py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)] lg:items-end">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Anmeldelser
            </div>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Hvad kunder faktisk siger efter de har valgt.
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-muted-foreground lg:justify-self-end">
            Anmeldelserne er gjort mere redaktionelle, så de læses som rigtige
            oplevelser i stedet for bare endnu en kort-grid.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-start">
          <article className="rounded-[40px] bg-foreground px-6 py-7 text-background shadow-sm sm:px-8 sm:py-8">
            <Stars rating={lead.rating} />
            <blockquote className="mt-6 max-w-[18ch] text-[2rem] font-semibold leading-[1.18] tracking-tight text-background sm:text-[2.5rem]">
              “{lead.comment}”
            </blockquote>
            <div className="mt-8 border-t border-background/12 pt-5">
              <div className="text-base font-semibold text-background">
                {lead.reviewer_name}
              </div>
              <div className="mt-1 text-sm text-background/70">
                Bekræftet kundeanmeldelse
              </div>
              {lead.businesses && (
                <Link
                  to={`/b/${lead.businesses.slug}`}
                  className="mt-2 inline-flex text-sm text-background/86 transition-opacity hover:opacity-80"
                >
                  om {lead.businesses.name}
                </Link>
              )}
            </div>
          </article>

          <div className="space-y-3">
            {sideReviews.map((review) => (
              <article
                key={review.id}
                className="rounded-[28px] bg-background px-5 py-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {review.reviewer_name}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Kundeanmeldelse
                    </div>
                  </div>
                  <Stars rating={review.rating} />
                </div>
                <p className="mt-4 text-sm leading-7 text-foreground">
                  “{review.comment}”
                </p>
                {review.businesses && (
                  <Link
                    to={`/b/${review.businesses.slug}`}
                    className="mt-4 inline-flex text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    om {review.businesses.name}
                  </Link>
                )}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";
import { Link } from "react-router-dom";
import HorizontalScroller from "./HorizontalScroller";

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

  const [lead, ...rest] = reviews;

  return (
    <section className="bg-background py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Anmeldelser
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Rigtige oplevelser fra kunder, der allerede har valgt.
            </h2>
          </div>
          <div className="text-sm text-muted-foreground">
            Udpluk af nyere anmeldelser på platformen
          </div>
        </div>

        <div className="hidden gap-4 lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <article className="flex min-h-[420px] flex-col justify-between rounded-[36px] bg-foreground px-7 py-7 text-background shadow-sm">
            <div>
              <Stars rating={lead.rating} />
              <p className="mt-8 max-w-[28ch] text-[1.65rem] font-semibold leading-[1.25] text-background">
                “{lead.comment}”
              </p>
            </div>
            <div className="mt-8 border-t border-background/12 pt-5">
              <div className="text-base font-semibold text-background">
                {lead.reviewer_name}
              </div>
              <div className="mt-1 text-sm text-background/68">
                Bekræftet kundeanmeldelse
              </div>
              {lead.businesses && (
                <Link
                  to={`/b/${lead.businesses.slug}`}
                  className="mt-2 inline-flex text-sm text-background/82 transition-opacity hover:opacity-80"
                >
                  om {lead.businesses.name}
                </Link>
              )}
            </div>
          </article>

          <div className="grid gap-4 sm:grid-cols-2">
            {rest.slice(0, 4).map((review) => (
              <article
                key={review.id}
                className="flex min-h-[200px] flex-col rounded-[28px] border border-border bg-card px-5 py-5 shadow-sm"
              >
                <Stars rating={review.rating} />
                <p className="mt-4 line-clamp-5 flex-1 text-sm leading-6 text-foreground">
                  “{review.comment}”
                </p>
                <div className="mt-4 border-t border-border pt-4">
                  <div className="text-sm font-semibold text-foreground">
                    {review.reviewer_name}
                  </div>
                  {review.businesses && (
                    <Link
                      to={`/b/${review.businesses.slug}`}
                      className="mt-1 inline-flex text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      om {review.businesses.name}
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="lg:hidden">
          <HorizontalScroller>
            {reviews.map((review) => (
              <article
                key={review.id}
                className="flex w-[320px] shrink-0 flex-col rounded-[28px] border border-border bg-card px-5 py-5 shadow-sm sm:w-[380px]"
              >
                <Stars rating={review.rating} />
                <p className="mt-4 line-clamp-6 flex-1 text-[15px] leading-relaxed text-foreground">
                  “{review.comment}”
                </p>
                <div className="mt-5 border-t border-border pt-4">
                  <div className="text-sm font-semibold text-foreground">
                    {review.reviewer_name}
                  </div>
                  {review.businesses && (
                    <Link
                      to={`/b/${review.businesses.slug}`}
                      className="mt-1 inline-flex text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      om {review.businesses.name}
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </HorizontalScroller>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;

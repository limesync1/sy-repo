import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, Quote } from "lucide-react";
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

const Testimonials = () => {
  const { data: reviews } = useQuery({
    queryKey: ["landing-testimonials"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, comment, reviewer_name, created_at, businesses(name, slug)")
        .gte("rating", 4)
        .not("comment", "is", null)
        .order("created_at", { ascending: false })
        .limit(12);
      return (data as unknown as Review[])?.filter((r) => r.comment && r.comment.length > 20) ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });

  if (!reviews || reviews.length === 0) return null;

  return (
    <section className="bg-secondary py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground">
              <Quote className="h-3.5 w-3.5 text-accent" />
              Kundernes oplevelse
            </div>
            <h2 className="mt-4 text-3xl leading-tight text-foreground md:text-[2.4rem]">Ægte erfaringer gør valget tryggere.</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">Anmeldelserne er præsenteret mere roligt, så kvalitet føles som et signal og ikke bare fyld.</p>
          </div>
          <div className="rounded-full bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm">
            Verificerede kundeudtalelser
          </div>
        </div>

        <HorizontalScroller>
          {reviews.map((r, index) => (
            <article
              key={r.id}
              className={`flex w-[320px] shrink-0 flex-col rounded-[28px] border border-border p-6 shadow-sm sm:w-[390px] ${index % 3 === 0 ? "bg-card" : index % 3 === 1 ? "bg-feature-cool" : "bg-feature-warm"}`}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className={`h-3.5 w-3.5 ${idx < r.rating ? "fill-foreground text-foreground" : "text-muted-foreground/20"}`}
                    />
                  ))}
                </div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{r.rating}.0 / 5</div>
              </div>
              <p className="mb-6 line-clamp-5 flex-1 text-[15px] leading-relaxed text-foreground">
                “{r.comment}”
              </p>
              <div className="flex items-center gap-3 border-t border-border/70 pt-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/80 text-sm font-bold text-foreground">
                  {r.reviewer_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-foreground">{r.reviewer_name}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">Bekræftet kundeanmeldelse</div>
                  {r.businesses && (
                    <Link to={`/b/${r.businesses.slug}`} className="truncate text-xs text-muted-foreground hover:text-foreground hover:underline">
                      om {r.businesses.name}
                    </Link>
                  )}
                </div>
              </div>
            </article>
          ))}
        </HorizontalScroller>
      </div>
    </section>
  );
};

export default Testimonials;

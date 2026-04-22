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
      return ((data as unknown) as Review[])?.filter((r) => r.comment && r.comment.length > 20) ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });

  if (!reviews || reviews.length === 0) return null;

  return (
    <section className="bg-secondary/35 py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Anmeldelser</div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Kunderne siger det kort
          </h2>
          </div>
          <div className="text-sm text-muted-foreground">Rigtige oplevelser fra rigtige kunder</div>
        </div>

        <div className="rounded-[36px] border border-border bg-background p-4 shadow-sm sm:p-5">
        <HorizontalScroller>
          {reviews.map((r) => (
            <article
              key={r.id}
              className="flex w-[320px] shrink-0 flex-col rounded-[24px] border border-border bg-card p-6 shadow-sm sm:w-[380px]"
            >
              <div className="mb-3 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star
                    key={idx}
                    className={`h-3.5 w-3.5 ${idx < r.rating ? "fill-foreground text-foreground" : "text-muted-foreground/20"}`}
                  />
                ))}
              </div>
              <p className="mb-5 line-clamp-5 flex-1 text-[15px] leading-relaxed text-foreground">
                "{r.comment}"
              </p>
              <div className="flex items-center gap-3 border-t border-border pt-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                  {r.reviewer_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-foreground">{r.reviewer_name}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">Bekræftet kundeanmeldelse</div>
                  {r.businesses && (
                    <Link
                      to={`/b/${r.businesses.slug}`}
                      className="truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                      om {r.businesses.name}
                    </Link>
                  )}
                </div>
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

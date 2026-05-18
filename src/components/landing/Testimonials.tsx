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
    <section className="bg-secondary py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 max-w-2xl md:mb-16">
          <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            <span className="h-px w-6 bg-foreground/30" />
            Anmeldelser
          </span>
          <h2 className="mt-5 text-[2rem] font-semibold leading-[1.04] tracking-[-0.025em] text-foreground md:text-[2.75rem] lg:text-[3.25rem]">Kundeoplevelser</h2>
          <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted-foreground md:text-base">Ægte erfaringer, uden unødig støj.</p>
        </div>

        <HorizontalScroller>
          {reviews.map((r) => (
            <article key={r.id} className="relative flex w-[300px] shrink-0 flex-col rounded-[24px] border border-border/70 bg-card p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-border sm:w-[360px]">
              <Quote aria-hidden className="absolute right-5 top-5 h-7 w-7 rotate-180 text-foreground/5" />
              <div className="mb-4 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star key={idx} className={`h-3.5 w-3.5 ${idx < r.rating ? "fill-foreground text-foreground" : "text-muted-foreground/20"}`} />
                ))}
              </div>
              <p className="mb-6 line-clamp-4 flex-1 text-[15px] leading-7 text-foreground">“{r.comment}”</p>
              <div className="flex items-center gap-3 border-t border-border pt-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold">
                  {r.reviewer_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{r.reviewer_name}</div>
                {r.businesses && (
                  <Link to={`/v/${r.businesses.slug}`} className="block truncate text-xs text-muted-foreground hover:text-foreground hover:underline">
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

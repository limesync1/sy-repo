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
      return (data as unknown as Review[])?.filter((r) => r.comment && r.comment.length > 20) ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });

  if (!reviews || reviews.length === 0) return null;

  return (
    <section className="bg-secondary py-12 md:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Kundeoplevelser</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-base">Ægte erfaringer, uden unødig støj.</p>
        </div>

        <HorizontalScroller>
          {reviews.map((r) => (
            <article key={r.id} className="flex w-[300px] shrink-0 flex-col rounded-[24px] border border-border bg-card p-5 shadow-sm sm:w-[340px]">
              <div className="mb-3 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star key={idx} className={`h-3.5 w-3.5 ${idx < r.rating ? "fill-foreground text-foreground" : "text-muted-foreground/20"}`} />
                ))}
              </div>
              <p className="mb-5 line-clamp-4 flex-1 text-[15px] leading-7 text-foreground">“{r.comment}”</p>
              <div className="border-t border-border pt-4">
                <div className="text-sm font-semibold text-foreground">{r.reviewer_name}</div>
                {r.businesses && (
                  <Link to={`/b/${r.businesses.slug}`} className="mt-1 inline-block text-xs text-muted-foreground hover:text-foreground hover:underline">
                    om {r.businesses.name}
                  </Link>
                )}
              </div>
            </article>
          ))}
        </HorizontalScroller>
      </div>
    </section>
  );
};

export default Testimonials;

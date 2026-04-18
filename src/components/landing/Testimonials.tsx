import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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
        .limit(9);
      return ((data as unknown) as Review[])?.filter((r) => r.comment && r.comment.length > 20) ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const [page, setPage] = useState(0);
  const perPage = 3;
  const totalPages = Math.max(1, Math.ceil((reviews?.length ?? 0) / perPage));
  const visible = reviews?.slice(page * perPage, page * perPage + perPage) ?? [];

  useEffect(() => {
    if (!reviews || reviews.length <= perPage) return;
    const id = setInterval(() => setPage((p) => (p + 1) % totalPages), 7000);
    return () => clearInterval(id);
  }, [reviews, totalPages]);

  if (!reviews || reviews.length === 0) return null;

  return (
    <section className="bg-secondary/50 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              Hvad kunderne siger
            </h2>
            <p className="mt-2 text-base text-muted-foreground">Ægte anmeldelser fra rigtige kunder.</p>
          </div>

          {reviews.length > perPage && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => (p - 1 + totalPages) % totalPages)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card transition-colors hover:border-accent/40 hover:text-accent"
                aria-label="Forrige"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => (p + 1) % totalPages)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card transition-colors hover:border-accent/40 hover:text-accent"
                aria-label="Næste"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {visible.map((r, i) => (
            <article
              key={r.id}
              className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{ animation: `fade-in 0.5s ease-out ${i * 100}ms both` }}
            >
              <Quote className="mb-4 h-7 w-7 text-accent/50" />
              <div className="mb-4 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star
                    key={idx}
                    className={`h-3.5 w-3.5 ${idx < r.rating ? "fill-accent text-accent" : "text-muted-foreground/20"}`}
                  />
                ))}
              </div>
              <p className="mb-6 flex-1 text-base leading-relaxed text-foreground">
                "{r.comment}"
              </p>
              <div className="border-t border-border pt-4">
                <div className="text-sm font-semibold text-foreground">{r.reviewer_name}</div>
                {r.businesses && (
                  <Link
                    to={`/b/${r.businesses.slug}`}
                    className="text-xs text-muted-foreground transition-colors hover:text-accent"
                  >
                    om {r.businesses.name}
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>

        {reviews.length > perPage && (
          <div className="mt-8 flex justify-center gap-1.5">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`h-1.5 rounded-full transition-all ${i === page ? "w-8 bg-accent" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"}`}
                aria-label={`Side ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Testimonials;

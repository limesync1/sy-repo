import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Star, ShieldCheck, MapPin, ArrowUpRight, ArrowRight } from "lucide-react";

type Biz = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  is_verified: boolean | null;
  category: string | null;
  categories: string[] | null;
  _avgRating?: number;
  _reviewCount?: number;
};

const RecentBusinesses = () => {
  const { data: businesses } = useQuery({
    queryKey: ["recent-businesses"],
    queryFn: async () => {
      const { data: bizList } = await supabase
        .from("businesses")
        .select("id, name, slug, city, logo_url, cover_image_url, is_verified, category, categories, created_at")
        .eq("is_active", true)
        .order("is_verified", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(4);

      if (!bizList?.length) return [] as Biz[];

      // Fetch ratings in one query
      const ids = bizList.map((b) => b.id);
      const { data: revs } = await supabase
        .from("reviews")
        .select("business_id, rating")
        .in("business_id", ids);

      const stats: Record<string, { sum: number; n: number }> = {};
      (revs ?? []).forEach((r) => {
        if (!stats[r.business_id]) stats[r.business_id] = { sum: 0, n: 0 };
        stats[r.business_id].sum += r.rating;
        stats[r.business_id].n += 1;
      });

      return bizList.map((b) => ({
        ...b,
        _avgRating: stats[b.id] ? stats[b.id].sum / stats[b.id].n : 0,
        _reviewCount: stats[b.id]?.n ?? 0,
      })) as Biz[];
    },
    staleTime: 1000 * 60 * 5,
  });

  if (!businesses || businesses.length === 0) return null;

  return (
    <section className="border-t border-border bg-background py-24 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-accent">Nye på platformen</p>
            <h2 className="text-4xl font-extrabold leading-[0.95] tracking-tight text-foreground md:text-6xl">
              Friske<br />
              <span className="text-muted-foreground">ansigter.</span>
            </h2>
          </div>
          <Link to="/search" className="group inline-flex items-center gap-2 text-sm font-semibold text-foreground">
            Se alle virksomheder
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {businesses.map((biz, i) => {
            const cat = biz.categories?.[0] ?? biz.category;
            return (
              <Link
                key={biz.id}
                to={`/b/${biz.slug}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-xl"
                style={{ animation: `fade-in 0.5s ease-out ${i * 80}ms both` }}
              >
                {/* Cover */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary">
                  {biz.cover_image_url ? (
                    <img
                      src={biz.cover_image_url}
                      alt={biz.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-muted">
                      {biz.logo_url ? (
                        <img src={biz.logo_url} alt="" className="h-16 w-16 object-contain opacity-60" />
                      ) : (
                        <span className="text-4xl font-bold text-muted-foreground/20">{biz.name.charAt(0)}</span>
                      )}
                    </div>
                  )}
                  {biz.is_verified && (
                    <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-semibold text-foreground backdrop-blur">
                      <ShieldCheck className="h-3 w-3 text-accent" />
                      Verificeret
                    </div>
                  )}
                  <ArrowUpRight className="absolute bottom-3 right-3 h-9 w-9 rounded-full border border-background/40 bg-background/80 p-2 text-foreground opacity-0 backdrop-blur transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold tracking-tight text-foreground line-clamp-1">{biz.name}</h3>
                    {biz._reviewCount && biz._reviewCount > 0 ? (
                      <div className="flex shrink-0 items-center gap-0.5 text-xs">
                        <Star className="h-3 w-3 fill-accent text-accent" />
                        <span className="font-semibold text-foreground">{biz._avgRating!.toFixed(1)}</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {biz.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {biz.city}
                      </span>
                    )}
                    {cat && <span className="truncate">{cat}</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RecentBusinesses;

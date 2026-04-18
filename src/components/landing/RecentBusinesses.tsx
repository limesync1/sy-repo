import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Star, ShieldCheck, MapPin, ArrowRight } from "lucide-react";

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
    <section className="bg-background py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              Nye virksomheder
            </h2>
            <p className="mt-2 text-base text-muted-foreground">Friske ansigter på platformen.</p>
          </div>
          <Link to="/search" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
            Se alle
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {businesses.map((biz) => {
            const cat = biz.categories?.[0] ?? biz.category;
            return (
              <Link
                key={biz.id}
                to={`/b/${biz.slug}`}
                className="group flex flex-col gap-3"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-secondary">
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
                        <span className="text-4xl font-bold text-muted-foreground/30">{biz.name.charAt(0)}</span>
                      )}
                    </div>
                  )}
                  {biz.is_verified && (
                    <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-card/95 px-2 py-0.5 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur">
                      <ShieldCheck className="h-3 w-3 text-accent" />
                      Verificeret
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold tracking-tight text-foreground line-clamp-1">{biz.name}</h3>
                    {biz._reviewCount && biz._reviewCount > 0 ? (
                      <div className="flex shrink-0 items-center gap-0.5 text-sm">
                        <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
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
